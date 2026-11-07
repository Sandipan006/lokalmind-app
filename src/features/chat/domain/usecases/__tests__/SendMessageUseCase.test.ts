import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import type { ChatMessage } from '../../entities/ChatMessage';
import type { IChatRepository } from '../../repositories/IChatRepository';
import { SendMessageUseCase } from '../SendMessageUseCase';

jest.mock('@/src/config/env', () => ({ env: { models: { chatMaxTokens: 512 } } }));

const userMessage: ChatMessage = {
  id: 'u1',
  sessionId: 's1',
  role: 'user',
  content: 'Explain how rainbows form.',
  status: 'done',
  createdAt: 0,
};

function setup(updateResult: unknown = { success: true, data: undefined }) {
  const generateResponse = jest.fn(async () => ({ text: 'ok', tokensUsed: 1, finishReason: 'stop' as const }));
  const llm = {
    isModelLoaded: () => true,
    getCurrentModelId: () => 'm1',
    getContextSize: () => null,
    generateResponse,
  } as unknown as ILLMEngine;
  const chatRepo = {
    saveMessage: async () => ({ success: true, data: undefined }),
    updateMessageContent: async () => updateResult,
  } as unknown as IChatRepository;
  const settings = {
    getModeSystemPromptOverride: async () => null,
  } as unknown as IAppSettingsRepository;
  const notify = jest.fn(async () => {});
  const useCase = new SendMessageUseCase(chatRepo, llm, settings, { notifyChatTurnComplete: notify } as never);
  return { useCase, generateResponse, notify };
}

describe('SendMessageUseCase', () => {
  // 2.6: without maxTokens llama.rn uses n_predict = -1 (unbounded).
  test('passes the configured max output tokens to the engine', async () => {
    const { useCase, generateResponse } = setup();
    await useCase.execute({
      sessionId: 's1',
      modelId: 'm1',
      userMessage,
      history: [],
      mode: 'default' as never,
      onToken: () => {},
      signal: new AbortController().signal,
    });
    const config = (generateResponse.mock.calls[0] as unknown[])[1] as { maxTokens?: number };
    expect(config.maxTokens).toBe(512);
  });

  // 2.4: "yes"/"no"/"ok" answer the assistant's last question; they must reach the model with history.
  test.each(['ok', 'no', 'sure', 'fine'])('short reply "%s" is sent to the model, not answered with a canned reply', async (text) => {
    const { useCase, generateResponse } = setup();
    const result = await useCase.execute({
      sessionId: 's1',
      modelId: 'm1',
      userMessage: { ...userMessage, content: text },
      history: [],
      mode: 'default' as never,
      onToken: () => {},
      signal: new AbortController().signal,
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
    expect(result.success && result.data.content).not.toBe('Got it.');
  });

  // 2.5: a long message is shortened by tokens and the user is told; it is no longer cut silently at 1800 chars.
  test('a long message is kept whole when it fits the budget', async () => {
    const { useCase, generateResponse } = setup();
    const long = 'word '.repeat(1000); // 5000 chars, ~1250 tokens
    await useCase.execute({
      sessionId: 's1', modelId: 'm1', userMessage: { ...userMessage, content: long }, history: [],
      mode: 'default' as never, onToken: () => {}, signal: new AbortController().signal,
    });
    const msgs = (generateResponse.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(msgs[msgs.length - 1]?.content).toBe(long);
  });

  test('an over-long message is shortened and the user is told', async () => {
    const { useCase, generateResponse } = setup();
    const tokens: string[] = [];
    const huge = 'word '.repeat(10000); // ~12,500 tokens
    const result = await useCase.execute({
      sessionId: 's1', modelId: 'm1', userMessage: { ...userMessage, content: huge }, history: [],
      mode: 'default' as never, onToken: (t) => tokens.push(t), signal: new AbortController().signal,
    });
    const msgs = (generateResponse.mock.calls[0] as unknown[])[0] as { content: string }[];
    expect(msgs[msgs.length - 1]?.content.length).toBeLessThan(huge.length);
    expect(tokens.join('')).toContain('too long');
    expect(result.success && result.data.content).toContain('too long');
  });

  // 3.1: a failed save must not look like success.
  test('returns the error and sends no success notification when the final save fails', async () => {
    const saveError = { code: 'DB_ERROR', message: 'disk full' };
    const { useCase, notify } = setup({ success: false, error: saveError });
    const result = await useCase.execute({
      sessionId: 's1', modelId: 'm1', userMessage, history: [],
      mode: 'default' as never, onToken: () => {}, signal: new AbortController().signal,
    });
    expect(result.success).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });
});
