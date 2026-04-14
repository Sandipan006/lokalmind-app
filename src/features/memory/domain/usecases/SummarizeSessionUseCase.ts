import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import type { Result } from '@/src/core/types';
import { createError, err, ok } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { SessionSummary } from '../entities/SessionSummary';
import type { IMemoryRepository } from '../repositories/IMemoryRepository';

export type SummarizeSessionParams =
  | {
      sessionId: string;
      sessionTitle: string;
      type: 'bucket';
      bucketIndex: number;
      turnStart: number;
      turnEnd: number;
    }
  | {
      sessionId: string;
      sessionTitle: string;
      type: 'cross-session';
      /** Raw messages passed when no bucket summaries exist (short sessions). */
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

interface ParsedSummary {
  topics: string;
  facts: string;
  done: string;
  open: string;
}

const SUMMARISE_PROMPT = (conversation: string) => `\
Read this conversation and fill in these fields. Write each field on its own line. No extra text.

TOPICS: list of topics, max 5, comma separated
FACTS: facts about the user - name, job, preferences, decisions
DONE: conclusions or action items the user reached
OPEN: unresolved questions or tasks (write NONE if nothing)

Conversation:
${conversation.slice(0, 3000)}`;

function parseSummaryResponse(raw: string): ParsedSummary {
  const result: ParsedSummary = { topics: 'NONE', facts: 'NONE', done: 'NONE', open: 'NONE' };
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('topics:') || lower.startsWith('topic:')) {
      result.topics = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('facts:') || lower.startsWith('fact:') || lower.startsWith('user_facts:')) {
      result.facts = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('done:') || lower.startsWith('decisions:') || lower.startsWith('decision:')) {
      result.done = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('open:')) {
      result.open = line.split(':').slice(1).join(':').trim() || 'NONE';
    }
  }

  return result;
}

function computeScore(createdAt: number, turnCount: number): number {
  const daysAgo = (Date.now() - createdAt) / 86_400_000;
  const recency = 1 / (1 + daysAgo);
  const engagement = Math.min(turnCount / 50, 1);
  return (0.7 * recency) + (0.3 * engagement);
}

function formatDaysAgo(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1w ago' : `${weeks}w ago`;
}

function formatSummary(parsed: ParsedSummary, sessionTitle: string, createdAt: number): string {
  const daysAgo = formatDaysAgo(createdAt);
  return `[${daysAgo} · ${sessionTitle}]
Topics: ${parsed.topics}
User facts: ${parsed.facts}
Resolved: ${parsed.done}
Open: ${parsed.open}`;
}

function normalizeUserStatement(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isMeaningfulUserStatement(text: string): boolean {
  if (text.length < 10) return false;
  // Pure question lines are unstable for memory extraction with small models.
  if (text.endsWith('?') && !text.includes('.') && !text.includes('!')) return false;
  return true;
}

function buildDeterministicCrossSessionSummary(
  sessionTitle: string,
  createdAt: number,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): { summary: string; userStatementCount: number } | null {
  const seen = new Set<string>();
  const userStatements: string[] = [];

  for (const m of messages) {
    if (m.role !== 'user') continue;
    const normalized = normalizeUserStatement(m.content);
    if (!isMeaningfulUserStatement(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    userStatements.push(normalized.slice(0, 220));
  }

  if (userStatements.length === 0) return null;

  const selected = userStatements.slice(-8);
  const daysAgo = formatDaysAgo(createdAt);
  return {
    summary: `[${daysAgo} · ${sessionTitle}]
User-stated facts:
${selected.map((line) => `- ${line}`).join('\n')}`,
    userStatementCount: selected.length,
  };
}

export class SummarizeSessionUseCase {
  constructor(
    private readonly llmEngine: ILLMEngine,
    private readonly memoryRepository: IMemoryRepository,
    private readonly memoryService?: {
      embedAndSave(memoryId: string, summaryText: string): Promise<void>;
    },
  ) {}

  async execute(params: SummarizeSessionParams): Promise<Result<void>> {
    if (!this.llmEngine.isModelLoaded()) {
      if (__DEV__) console.log('[Memory] Skipping summarisation — no model loaded');
      return ok(undefined);
    }
    if (this.llmEngine.isGenerating()) {
      if (__DEV__) console.log('[Memory] Skipping summarisation — LLM is generating');
      return ok(undefined);
    }

    const { sessionId, sessionTitle } = params;

    try {
      const now = Date.now();
      if (params.type === 'cross-session' && params.messages?.length) {
        const deterministic = buildDeterministicCrossSessionSummary(sessionTitle, now, params.messages);
        if (deterministic) {
          const score = computeScore(now, params.messages.length);
          const memory: SessionMemory = {
            id: `mem_${sessionId}_${now}`,
            sessionId,
            sessionTitle,
            summary: deterministic.summary,
            embedding: null,
            score,
            isPinned: false,
            isUserEdited: false,
            createdAt: now,
            updatedAt: now,
          };
          const saveResult = await this.memoryRepository.saveSessionMemory(memory);
          if (!saveResult.success) return saveResult;
          if (__DEV__) console.log('[Memory] Saved deterministic cross-session memory', {
            sessionId,
            userStatementCount: deterministic.userStatementCount,
          });
          void this.memoryService?.embedAndSave(memory.id, memory.summary).catch((e) => {
            if (__DEV__) console.warn('[Memory] embedAndSave after cross-session save failed:', e);
          });
          await this.evictIfNeeded();
          return ok(undefined);
        }
        // Do not fall back to LLM summarisation for cross-session memory when user facts are absent.
        // This avoids storing assistant-generated noise as long-term memory.
        if (__DEV__) console.log('[Memory] Skipping cross-session save — no deterministic user statements found');
        return ok(undefined);
      }

      // Retrieve session conversation context from existing summaries for prompt.
      const summariesResult = await this.memoryRepository.getSessionSummaries(sessionId);
      const existingSummaries = summariesResult.success ? summariesResult.data : [];

      // For short sessions with no bucket summaries, fall back to raw message text.
      let conversationContext = existingSummaries.map((s) => s.summary).join('\n---\n');
      if (!conversationContext && params.type === 'cross-session' && params.messages?.length) {
        conversationContext = params.messages
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
          .join('\n');
        if (__DEV__) console.log('[Memory] Using raw messages as summarisation context', { count: params.messages.length });
      }

      const modelId = this.llmEngine.getCurrentModelId();
      if (!modelId) return ok(undefined);

      const promptContent = SUMMARISE_PROMPT(conversationContext || `Session: ${sessionTitle}`);

      const signal = new AbortController().signal;
      const response = await this.llmEngine.generateResponse(
        [{ role: 'user', content: promptContent }],
        { modelId, temperature: 0.3, maxTokens: 80 },
        undefined,
        signal,
      );

      const parsed = parseSummaryResponse(response.text);
      const allNone =
        parsed.topics === 'NONE' &&
        parsed.facts === 'NONE' &&
        parsed.done === 'NONE' &&
        parsed.open === 'NONE';

      if (allNone) {
        if (__DEV__) console.warn('[Memory] Summarisation produced all-NONE result — skipping save');
        return ok(undefined);
      }

      const summaryText = formatSummary(parsed, sessionTitle, now);

      if (params.type === 'bucket') {
        const summary: SessionSummary = {
          id: `sum_${sessionId}_${params.bucketIndex}_${now}`,
          sessionId,
          bucketIndex: params.bucketIndex,
          summary: summaryText,
          turnStart: params.turnStart,
          turnEnd: params.turnEnd,
          createdAt: now,
        };
        return await this.memoryRepository.saveSessionSummary(summary);
      } else {
        const turnCount = existingSummaries.length * 20;
        const score = computeScore(now, turnCount);
        const memory: SessionMemory = {
          id: `mem_${sessionId}_${now}`,
          sessionId,
          sessionTitle,
          summary: summaryText,
          embedding: null,
          score,
          isPinned: false,
          isUserEdited: false,
          createdAt: now,
          updatedAt: now,
        };
        const saveResult = await this.memoryRepository.saveSessionMemory(memory);
        if (!saveResult.success) return saveResult;
        void this.memoryService?.embedAndSave(memory.id, memory.summary).catch((e) => {
          if (__DEV__) console.warn('[Memory] embedAndSave after LLM cross-session save failed:', e);
        });

        // Evict lowest-scored non-pinned memory when over the limit.
        await this.evictIfNeeded();
        return ok(undefined);
      }
    } catch (e) {
      return err(createError('GENERATION_ERROR', 'Failed to summarize session', e));
    }
  }

  private async evictIfNeeded(max = 10): Promise<void> {
    const count = await this.memoryRepository.countNonPinnedMemories();
    if (!count.success || count.data <= max) return;
    await this.memoryRepository.deleteLowestScoredMemory();
  }
}
