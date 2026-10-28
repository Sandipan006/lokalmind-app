import type { SessionSummary } from '@/src/features/memory/domain/entities/SessionSummary';
import { buildContextMessages, estimateTokens } from '../tokenBudget';

const BUDGET_TOTAL = 3800;

const summary = (bucketIndex: number, text: string): SessionSummary => ({
  id: `s${bucketIndex}`,
  sessionId: 'sess',
  bucketIndex,
  summary: text,
  turnStart: 0,
  turnEnd: 0,
  createdAt: 0,
});

describe('estimateTokens', () => {
  test('Latin text is ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});

describe('buildContextMessages', () => {
  // C01 / F02: the 4-turn history floor used to let the context exceed the total budget.
  test('C01 never exceeds the total token budget', () => {
    const big = 'x'.repeat(4000); // 1000 tokens each
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: big,
    }));
    const out = buildContextMessages({
      systemPrompt: 'sys',
      pinnedFacts: '',
      userProfile: '',
      inSessionSummaries: [],
      history,
      currentMessage: { role: 'user', content: big },
    });
    const total = out.reduce((n, m) => n + estimateTokens(m.content), 0);
    expect(total).toBeLessThanOrEqual(BUDGET_TOTAL);
  });

  // C02 / F03: with a tight summary budget the NEW summary is dropped and the OLD one kept.
  test.failing('C02 keeps the newest in-session summary when budget is tight', () => {
    const out = buildContextMessages({
      systemPrompt: 'sys',
      pinnedFacts: '',
      userProfile: '',
      inSessionSummaries: [
        summary(0, 'OLD ' + 'a'.repeat(400)), // 101 tokens
        summary(1, 'NEW ' + 'b'.repeat(400)), // 101 tokens, does not fit with OLD in 150
      ],
      history: [],
      currentMessage: { role: 'user', content: 'hi' },
    });
    const system = out[0]?.content ?? '';
    expect(system).toContain('NEW');
    expect(system).not.toContain('OLD');
  });

  // 2.1: a 2048-token window must hold prompt + reserved reply, even if that drops the 4-turn floor.
  test('never exceeds contextSize minus reserved output tokens', () => {
    const big = 'x'.repeat(2000); // 500 tokens each
    const history = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: big,
    }));
    const out = buildContextMessages({
      systemPrompt: 'sys',
      pinnedFacts: '',
      userProfile: 'p'.repeat(800),
      inSessionSummaries: [summary(0, 's'.repeat(400))],
      history,
      currentMessage: { role: 'user', content: 'hello there' },
      contextSize: 2048,
      reservedOutputTokens: 512,
    });
    const total = out.reduce((n, m) => n + estimateTokens(m.content), 0);
    expect(total).toBeLessThanOrEqual(2048 - 512 - 64);
    expect(out[out.length - 1]?.content).toBe('hello there');
  });

  test('drops memory blocks before the system prompt when history is already empty', () => {
    const out = buildContextMessages({
      systemPrompt: 'SYSTEM',
      pinnedFacts: '',
      userProfile: 'p'.repeat(800), // 200 tokens
      inSessionSummaries: [],
      history: [],
      currentMessage: { role: 'user', content: 'x'.repeat(4000) }, // 1000 tokens
      contextSize: 1200,
      reservedOutputTokens: 100,
    });
    expect(out[0]?.content).toBe('SYSTEM');
  });
});
