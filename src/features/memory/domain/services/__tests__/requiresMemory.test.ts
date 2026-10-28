import { requiresMemory } from '../MemoryService';

// [message, turnCount, expected]. "Generic" questions must not pull user memory; self-references must.
const cases: [string, number, boolean][] = [
  // English
  ['What is the capital of France?', 5, false],
  ['What do I like to eat?', 0, true],
  ['Remember what I told you about my project', 0, true],
  ['do that again', 3, true],
  ['hello', 3, false],
  // Hindi
  ['भारत की राजधानी क्या है?', 5, false],
  ['मेरा नाम क्या है?', 0, true],
  ['मुझे क्या पसंद है, याद है?', 0, true],
  ['पहले जैसा ही करो', 3, true],
  // Bengali
  ['ফ্রান্সের রাজধানী কী?', 5, false],
  ['আমার নাম কী?', 0, true],
  ['আগের মতো আবার করো', 3, true],
  // Romanised / mixed
  ['bharat ki rajdhani kya hai?', 5, false],
  ['mera naam kya hai?', 0, true],
  ['mujhe kya pasand hai batao', 0, true],
  ['amar naam ki?', 0, true],
  ['Explain this again, पहले जैसा', 2, true],
  ['Translate "good morning" to Hindi', 3, false],
];

describe('requiresMemory', () => {
  test.each(cases)('%s (turns=%i) -> %s', (message, turns, expected) => {
    expect(requiresMemory(message, turns)).toBe(expected);
  });
});
