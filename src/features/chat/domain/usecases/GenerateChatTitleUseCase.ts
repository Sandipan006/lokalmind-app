import type { Result } from '@/src/core/types';
import { ok, err, createError } from '@/src/core/types';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { IChatRepository } from '../repositories/IChatRepository';

function resolveTitleBucket(totalMessages: number): number {
  if (totalMessages >= 1 && totalMessages <= 4) return 1;   // start
  if (totalMessages >= 5 && totalMessages <= 10) return 2;  // 5-10
  if (totalMessages >= 15 && totalMessages <= 20) return 3; // 15-20
  return 0;
}

function sanitizeTitle(raw: string): string {
  const oneLine = raw.replace(/\r?\n/g, ' ').replace(/^["'\-:\s]+|["'\-:\s]+$/g, '');
  return oneLine.slice(0, 48).trim();
}

export class GenerateChatTitleUseCase {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmEngine: ILLMEngine,
  ) {}

  async execute(sessionId: string, modelId: string): Promise<Result<void>> {
    try {
      const [sessionResult, messagesResult] = await Promise.all([
        this.chatRepository.getSession(sessionId),
        this.chatRepository.getMessages(sessionId),
      ]);

      if (!sessionResult.success) return sessionResult;
      if (!messagesResult.success) return messagesResult;
      if (!sessionResult.data) return ok(undefined);

      const session = sessionResult.data;
      if (session.isTitleLocked) return ok(undefined);

      const messages = messagesResult.data;
      const bucket = resolveTitleBucket(messages.length);
      if (bucket === 0 || bucket <= session.lastTitleBucket) return ok(undefined);

      if (!this.llmEngine.isModelLoaded() || this.llmEngine.getCurrentModelId() !== modelId) {
        await this.llmEngine.initialize(modelId, { modelId });
      }

      const transcript = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n')
        .slice(0, 3000);
      const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content.trim()).filter(Boolean);
      const firstUserIntent = userMessages[0] ?? '';
      const latestUserIntent = userMessages[userMessages.length - 1] ?? '';
      const userIntentOnly = userMessages.join('\n').slice(0, 1200);

      const titleMessages: LLMMessage[] = [
        {
          role: 'system',
          content: `Generate a neutral, topic-focused chat title for chat history.

Rules:
- Focus on the user's main intent/topic, not assistant wording style.
- Ignore emotional/subjective adjectives from assistant responses (e.g., "boring", "amazing", "perfect").
- Prefer stable topic nouns over procedural phrasing.
- Keep it 3-6 words, clear and scannable.
- Return ONLY the title text.
- No quotes, no trailing punctuation.`,
        },
        {
          role: 'user',
          content: `First user intent: ${firstUserIntent}
Latest user intent: ${latestUserIntent}

User messages only:
${userIntentOnly}

Full conversation:
${transcript}`,
        },
      ];

      const response = await this.llmEngine.generateResponse(titleMessages, {
        modelId,
        temperature: 0.4,
        maxTokens: 18,
      });

      const nextTitle = sanitizeTitle(response.text);
      if (!nextTitle) return ok(undefined);
      console.log('[Chat][Title] Generated:', nextTitle);

      return await this.chatRepository.updateAutoSessionTitle(sessionId, nextTitle, bucket);
    } catch (e) {
      return err(createError('GENERATION_ERROR', 'Failed to generate chat title', e));
    }
  }
}
