import { buildContextMessages, estimateTokens, fitInputToTokens, maxInputTokens } from '../tokenBudget';

const BUDGET_TOTAL = 3800;

const turns = (count: number, content: string) =>
  Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content,
  }));

const totalTokens = (messages: { content: string }[]) =>
  messages.reduce((n, m) => n + estimateTokens(m.content), 0);

describe('estimateTokens', () => {
  test('Latin text is ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});

describe('buildContextMessages', () => {
  // C01 / F02: the 4-turn history floor used to let the context exceed the total budget.
  test('C01 never exceeds the total token budget', () => {
    const big = 'x'.repeat(4000); // 1000 tokens each
    const out = buildContextMessages({
      systemPrompt: 'sys',
      history: turns(10, big),
      currentMessage: { role: 'user', content: big },
    });
    expect(totalTokens(out)).toBeLessThanOrEqual(BUDGET_TOTAL);
  });

  // 2.1: a 2048-token window must hold prompt + reserved reply, even if that drops the 4-turn floor.
  test('never exceeds contextSize minus reserved output tokens', () => {
    const out = buildContextMessages({
      systemPrompt: 'sys',
      history: turns(8, 'x'.repeat(2000)), // 500 tokens each
      currentMessage: { role: 'user', content: 'hello there' },
      contextSize: 2048,
      reservedOutputTokens: 512,
    });
    expect(totalTokens(out)).toBeLessThanOrEqual(2048 - 512 - 64);
    expect(out[out.length - 1]?.content).toBe('hello there');
  });

  test('keeps the most recent history when it has to cut', () => {
    const history = [
      { role: 'user' as const, content: 'OLD ' + 'x'.repeat(3000) },
      { role: 'assistant' as const, content: 'OLD ' + 'x'.repeat(3000) },
      { role: 'user' as const, content: 'NEW question' },
      { role: 'assistant' as const, content: 'NEW answer' },
    ];
    const out = buildContextMessages({
      systemPrompt: 'sys',
      history,
      currentMessage: { role: 'user', content: 'next' },
      contextSize: 1200,
      reservedOutputTokens: 100,
    });
    const text = out.map((m) => m.content).join('|');
    expect(text).toContain('NEW answer');
    expect(text).not.toContain('OLD');
  });
});

describe('fitInputToTokens', () => {
  test('returns short text unchanged', () => {
    expect(fitInputToTokens('hello', 100)).toEqual({ text: 'hello', truncated: false });
  });

  test('keeps head and tail of long text and says it cut', () => {
    const text = 'START ' + 'word '.repeat(5000) + 'END';
    const fit = fitInputToTokens(text, 500);
    expect(fit.truncated).toBe(true);
    expect(fit.text.startsWith('START')).toBe(true);
    expect(fit.text.endsWith('END')).toBe(true);
    expect(estimateTokens(fit.text)).toBeLessThanOrEqual(500);
  });

  test('maxInputTokens shrinks with the context window', () => {
    expect(maxInputTokens(2048, 512)).toBeLessThan(maxInputTokens(undefined, 512));
  });
});
