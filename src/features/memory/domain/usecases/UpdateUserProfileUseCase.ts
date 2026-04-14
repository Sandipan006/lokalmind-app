import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import type { Result } from '@/src/core/types';
import { createError, err, ok } from '@/src/core/types';

const PROFILE_MAX_CHARS = 600;

/**
 * Designed for small models (0.8B+): third-person format, explicit example, tightly scoped.
 * Conversation is capped to last 10 messages × 300 chars each to stay within context budget.
 */
const buildUpdatePrompt = (profile: string, conversation: string) =>
  `You are a memory assistant. Extract facts about the human user from their messages.

Current profile:
${profile || '(none yet)'}

User messages:
${conversation}

Output a single plain paragraph. Start with their name if known. Example: "The person you are talking to is named Alex."

Rules:
- ONLY use facts the user EXPLICITLY STATED word-for-word. Never infer, guess, or add any detail not directly said by the user.
- Always start with "The person you are talking to is named [name]." if the name is known.
- IGNORE questions (e.g. "what is my name?", "who am I?" are questions, not facts).
- IGNORE small talk ("hey", "hello", etc.).
- Keep existing facts unless the user corrects them.
- If nothing new was learned, return the current profile unchanged.
- Max 400 characters. No headers, no lists, no quotes.`;

const NAME_FROM_MY_NAME_IS = /\bmy name is\s+([a-z][a-z'-]{1,30}(?:\s+[a-z][a-z'-]{1,30}){0,1})\b/i;
const NAME_FROM_I_AM_STRICT = /^\s*i am\s+([a-z][a-z'-]{1,30}(?:\s+[a-z][a-z'-]{1,30}){0,1})\s*[.!]?\s*$/i;
const NAME_FROM_IM_STRICT = /^\s*i'm\s+([a-z][a-z'-]{1,30}(?:\s+[a-z][a-z'-]{1,30}){0,1})\s*[.!]?\s*$/i;

function normaliseText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isQuestionOnly(text: string): boolean {
  return text.endsWith('?') && !text.includes('.') && !text.includes('!');
}

function startsLikeQuestion(text: string): boolean {
  return /^(who|what|where|when|why|how|which|can|could|would|should|do|did|does|is|are|am|will)\b/i.test(
    text.trim(),
  );
}

function isLikelyNameCandidate(value: string): boolean {
  const words = value.trim().split(/\s+/);
  if (words.length === 0 || words.length > 2) return false;
  return words.every((w) => /^[a-z][a-z'-]{1,30}$/i.test(w));
}

function isSmallTalk(text: string): boolean {
  const t = text.toLowerCase();
  return t === 'hi' || t === 'hey' || t === 'hello' || t === 'yo' || t === 'sup';
}

function extractNameFromText(text: string): string | null {
  const fromMyNameIs = text.match(NAME_FROM_MY_NAME_IS)?.[1];
  const fromStrictIam = text.match(NAME_FROM_I_AM_STRICT)?.[1];
  const fromStrictIm = text.match(NAME_FROM_IM_STRICT)?.[1];
  const source = fromMyNameIs ?? fromStrictIam ?? fromStrictIm;
  if (!source || !isLikelyNameCandidate(source)) return null;
  const raw = source.trim().split(/\s+/).slice(0, 2).join(' ');
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractCurrentProfileName(profile: string): string | null {
  const match = profile.match(
    /^The person you are talking to is named\s+([A-Za-z][A-Za-z'-]{1,30}(?:\s+[A-Za-z][A-Za-z'-]{1,30}){0,2})\./i,
  );
  return match?.[1]?.trim() ?? null;
}

function extractProfileFacts(profile: string): string[] {
  return profile
    .split(/[.]\s+/)
    .map((s) => normaliseText(s))
    .filter((s) => s.length > 0)
    .filter((s) => !/^the person you are talking to is named\b/i.test(s));
}

function buildDeterministicProfile(
  currentProfile: string,
  userMessages: string[],
): string | null {
  const existingName = extractCurrentProfileName(currentProfile);
  let name: string | null = existingName;
  const factSet = new Map<string, string>();

  for (const fact of extractProfileFacts(currentProfile)) {
    factSet.set(fact.toLowerCase(), fact.endsWith('.') ? fact : `${fact}.`);
  }

  for (const raw of userMessages) {
    const text = normaliseText(raw);
    if (!text || isSmallTalk(text) || isQuestionOnly(text) || startsLikeQuestion(text)) continue;
    const maybeName = extractNameFromText(text);
    if (maybeName) name = maybeName;

    if (text.length < 10) continue;
    const facts = text
      .split(/[.!\n]/)
      .map((s) => normaliseText(s))
      .filter((s) => s.length >= 10)
      .filter((s) => !s.endsWith('?'))
      .filter((s) => !startsLikeQuestion(s))
      .slice(0, 2);

    for (const fact of facts) {
      const key = fact.toLowerCase();
      if (!factSet.has(key)) {
        factSet.set(key, fact.endsWith('.') ? fact : `${fact}.`);
      }
    }
  }

  if (!name && factSet.size === 0) return null;
  const factList = Array.from(factSet.values()).slice(0, 6);
  const pieces: string[] = [];
  if (name) {
    pieces.push(`The person you are talking to is named ${name}.`);
  }
  if (factList.length > 0) {
    pieces.push(`User-stated facts: ${factList.join(' ')}`);
  }
  return normaliseText(pieces.join(' ')).slice(0, PROFILE_MAX_CHARS);
}

export class UpdateUserProfileUseCase {
  constructor(
    private readonly llmEngine: ILLMEngine,
    private readonly appSettingsRepository: IAppSettingsRepository,
  ) {}

  async execute(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<Result<void>> {
    // Only use user-turns for fact extraction — assistant turns add noise for small models.
    const hasUserContent = messages.some((m) => m.role === 'user');
    if (!hasUserContent) return ok(undefined);

    const currentProfile = await this.appSettingsRepository.getUserProfile();

    // Only user turns — assistant replies add noise and confuse small models during extraction.
    const userMessages = messages
      .slice(-20)
      .filter((m) => m.role === 'user')
      .map((m) => m.content.trim());

    // Pre-filter: skip LLM call entirely if the user only asked questions or said small talk.
    // A 0.8B model will hallucinate a shorter profile when given nothing factual to work with,
    // even if the prompt says "return unchanged". This prevents profile degradation.
    const hasMeaningfulStatement = userMessages.some((content) => {
      if (content.length < 8) return false; // small talk ("hey", "hi", etc.)
      // Pure question: ends with ? and has no declarative sentence (no . or !)
      if (content.endsWith('?') && !content.includes('.') && !content.includes('!')) return false;
      return true;
    });

    if (!hasMeaningfulStatement) return ok(undefined);

    const deterministicProfile = buildDeterministicProfile(currentProfile, userMessages);
    if (deterministicProfile && deterministicProfile !== currentProfile) {
      await this.appSettingsRepository.saveUserProfile(deterministicProfile);
      if (__DEV__) console.log('[Memory] User profile updated (deterministic)', { chars: deterministicProfile.length });
      return ok(undefined);
    }

    if (!this.llmEngine.isModelLoaded()) return ok(undefined);
    if (this.llmEngine.isGenerating()) return ok(undefined);
    const modelId = this.llmEngine.getCurrentModelId();
    if (!modelId) return ok(undefined);

    const conversation = userMessages.map((c) => c.slice(0, 300)).join('\n');

    try {
      const signal = new AbortController().signal;
      const response = await this.llmEngine.generateResponse(
        [{ role: 'user', content: buildUpdatePrompt(currentProfile, conversation) }],
        { modelId, temperature: 0.2, maxTokens: 150 },
        undefined,
        signal,
      );

      const updated = response.text.trim().slice(0, PROFILE_MAX_CHARS);
      if (!updated || updated === currentProfile) return ok(undefined);

      // Safety guard: small models sometimes "forget" facts and generate a shorter profile
      // when the session added nothing new. If the update would lose >20% of characters,
      // the model likely dropped facts rather than learned anything — keep the current profile.
      if (currentProfile && updated.length < currentProfile.length * 0.8) {
        if (__DEV__) console.log('[Memory] Profile update skipped — new profile shorter than current (likely lost facts)');
        return ok(undefined);
      }

      await this.appSettingsRepository.saveUserProfile(updated);
      if (__DEV__) console.log('[Memory] User profile updated', { chars: updated.length });
      return ok(undefined);
    } catch (e) {
      return err(createError('GENERATION_ERROR', 'Failed to update user profile', e));
    }
  }
}
