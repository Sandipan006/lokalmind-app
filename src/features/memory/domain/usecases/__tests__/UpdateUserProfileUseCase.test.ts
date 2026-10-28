import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import { UpdateUserProfileUseCase } from '../UpdateUserProfileUseCase';

// Only the profile getter/setter is used; the LLM is never reached on the deterministic path.
function setup(initialProfile = '') {
  let profile = initialProfile;
  const repo = {
    getUserProfile: async () => profile,
    saveUserProfile: async (p: string) => {
      profile = p;
    },
  } as unknown as IAppSettingsRepository;
  const llm = { isModelLoaded: () => false, isGenerating: () => false } as unknown as ILLMEngine;
  const useCase = new UpdateUserProfileUseCase(llm, repo);
  const send = (...texts: string[]) =>
    useCase.execute(texts.map((content) => ({ role: 'user' as const, content })));
  return { send, profile: () => profile };
}

describe('UpdateUserProfileUseCase (deterministic profile)', () => {
  test('stores a name from "my name is"', async () => {
    const s = setup();
    await s.send('My name is Priya Sharma');
    expect(s.profile()).toContain('named Priya Sharma');
  });

  // C03 / F01
  test.failing('C03 "I am tired" is not a name', async () => {
    const s = setup();
    await s.send('I am tired');
    expect(s.profile()).not.toContain('named Tired');
  });

  // C04 / F01
  test.failing('C04 a drafting request is not stored as a user fact', async () => {
    const s = setup();
    await s.send('Write a short LinkedIn post about my launch.');
    expect(s.profile()).not.toContain('LinkedIn post');
  });

  // C05 / F01
  test.failing('C05 "User-stated facts:" prefix is not duplicated across updates', async () => {
    const s = setup();
    await s.send('I work as a nurse in Pune.');
    await s.send('I have a dog called Bruno.');
    const count = (s.profile().match(/User-stated facts:/g) ?? []).length;
    expect(count).toBe(1);
  });
});
