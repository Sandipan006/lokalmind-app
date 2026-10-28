import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import { extractNameFromText, UpdateUserProfileUseCase } from '../UpdateUserProfileUseCase';

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
  test('C03 "I am tired" is not a name', async () => {
    const s = setup();
    await s.send('I am tired');
    expect(s.profile()).not.toContain('named Tired');
  });

  // C04 / F01
  test('C04 a drafting request is not stored as a user fact', async () => {
    const s = setup();
    await s.send('Write a short LinkedIn post about my launch.');
    expect(s.profile()).not.toContain('LinkedIn post');
  });

  // C05 / F01
  test('C05 "User-stated facts:" prefix is not duplicated across updates', async () => {
    const s = setup();
    await s.send('I work as a nurse in Pune.');
    await s.send('I have a dog called Bruno.');
    const count = (s.profile().match(/User-stated facts:/g) ?? []).length;
    expect(count).toBe(1);
  });

  test('"call me Sam" sets the name', async () => {
    const s = setup();
    await s.send('Call me Sam');
    expect(s.profile()).toContain('named Sam');
  });

  test('a later "my name is" replaces the earlier name', async () => {
    const s = setup();
    await s.send('My name is Priya');
    await s.send('Actually my name is Ria');
    expect(s.profile()).toContain('named Ria');
    expect(s.profile()).not.toContain('Priya');
  });

  test('quoted text is ignored', async () => {
    const s = setup();
    await s.send('He said "my name is Zed and I live on Mars" in the movie.');
    expect(s.profile()).not.toContain('Zed');
    expect(s.profile()).not.toContain('Mars');
  });

  test('imagine/pretend requests are not stored as facts', async () => {
    const s = setup();
    await s.send('Imagine I am a pirate captain on a ship.');
    expect(s.profile()).toBe('');
  });

  test('extractNameFromText accepts only explicit identity', () => {
    expect(extractNameFromText('I am tired')).toBeNull();
    expect(extractNameFromText("I'm Priya")).toBeNull();
    expect(extractNameFromText('my name is priya sharma')).toBe('Priya Sharma');
  });
});
