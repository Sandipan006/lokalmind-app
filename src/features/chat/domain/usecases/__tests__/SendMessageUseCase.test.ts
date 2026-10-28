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

function setup() {
  const generateResponse = jest.fn(async () => ({ text: 'ok', tokensUsed: 1, finishReason: 'stop' as const }));
  const llm = {
    isModelLoaded: () => true,
    getCurrentModelId: () => 'm1',
    getContextSize: () => null,
    generateResponse,
  } as unknown as ILLMEngine;
  const chatRepo = {
    saveMessage: async () => ({ success: true, data: undefined }),
    updateMessageContent: async () => ({ success: true, data: undefined }),
  } as unknown as IChatRepository;
  const settings = {
    getModeSystemPromptOverride: async () => null,
    getPinnedFacts: async () => '',
    getUserProfile: async () => '',
  } as unknown as IAppSettingsRepository;
  const useCase = new SendMessageUseCase(chatRepo, llm, settings);
  return { useCase, generateResponse };
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
});
