import { REMINDER_COPY } from '../reminderCopy';
import {
  buildReminderPlan,
  REMINDER_ID_PREFIX,
  REMINDER_MIN_LEAD_MS,
  REMINDER_WINDOWS,
  REMINDER_TOTAL,
} from '../reminderPlan';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('buildReminderPlan', () => {
  const now = at(2026, 11, 8, 0, 19);
  const plan = buildReminderPlan(now);

  test('schedules 56 reminders, under the iOS limit of 64 pending', () => {
    expect(plan).toHaveLength(REMINDER_TOTAL);
    expect(REMINDER_TOTAL).toBeLessThan(64);
  });

  test('is in time order, with unique ids', () => {
    const times = plan.map((r) => r.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(plan.map((r) => r.id)).size).toBe(REMINDER_TOTAL);
    expect(plan.every((r) => r.id.startsWith(REMINDER_ID_PREFIX))).toBe(true);
  });

  const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

  test('every reminder lands inside its own window, outside sleep hours', () => {
    for (const r of plan) {
      const w = REMINDER_WINDOWS.find((x) => x.name === r.slot)!;
      expect(minuteOf(r.at)).toBeGreaterThanOrEqual(w.from);
      expect(minuteOf(r.at)).toBeLessThanOrEqual(w.to);
    }
    expect(plan.every((r) => minuteOf(r.at) >= 8 * 60 + 30 && minuteOf(r.at) <= 21 * 60 + 45)).toBe(true);
  });

  test('3 or 4 a day, and the count varies', () => {
    const perDay = new Map<string, number>();
    plan.forEach((r) => perDay.set(r.at.toDateString(), (perDay.get(r.at.toDateString()) ?? 0) + 1));
    const middle = [...perDay.values()].slice(1, -1);
    expect(middle.every((c) => c === 3 || c === 4)).toBe(true);
    expect(new Set(middle).size).toBe(2);
  });

  test('times are dynamic: not the same minute every day', () => {
    const mornings = plan.filter((r) => r.slot === 'morning').map((r) => minuteOf(r.at));
    expect(new Set(mornings).size).toBeGreaterThan(5);
  });

  test('spans about 15 days', () => {
    const days = (plan[55]!.at.getTime() - plan[0]!.at.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(12);
    expect(days).toBeLessThanOrEqual(19);
  });

  test('skips reminders closer than the minimum lead', () => {
    const start = at(2026, 11, 8, 8, 0);
    const p = buildReminderPlan(start);
    expect(p.every((r) => r.at.getTime() - start.getTime() >= REMINDER_MIN_LEAD_MS)).toBe(true);
    expect(p.length).toBe(REMINDER_TOTAL);
  });

  test('late at night, the first reminder is next morning', () => {
    const start = at(2026, 11, 8, 23, 30);
    const p = buildReminderPlan(start);
    expect(p[0]!.at.getDate()).toBe(9);
    expect(p[0]!.slot).toBe('morning');
  });

  test('same date gives the same times however many times it is rebuilt', () => {
    const a = buildReminderPlan(at(2026, 11, 8, 0, 19)).slice(0, 3).map((r) => r.at.getTime());
    const b = buildReminderPlan(at(2026, 11, 8, 0, 40)).slice(0, 3).map((r) => r.at.getTime());
    expect(a).toEqual(b);
  });

  test('is deterministic for the same time', () => {
    expect(buildReminderPlan(now)).toEqual(plan);
  });

  test('a new open restarts the plan from that moment (count resets)', () => {
    const later = at(2026, 11, 10, 14, 0);
    const p = buildReminderPlan(later);
    expect(p).toHaveLength(REMINDER_TOTAL);
    expect(p[0]!.at.getTime()).toBeGreaterThanOrEqual(later.getTime() + REMINDER_MIN_LEAD_MS);
    expect(p[0]!.id).toBe(`${REMINDER_ID_PREFIX}0`);
  });

  test('no copy repeats within 14 uses of a slot', () => {
    for (const w of REMINDER_WINDOWS) {
      const titles = plan.filter((r) => r.slot === w.name).slice(0, 14).map((r) => r.copy.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  test('copy opening a plan differs from one day to the next', () => {
    const next = buildReminderPlan(at(2026, 11, 9, 0, 19));
    expect(next[0]!.copy.title).not.toBe(plan[0]!.copy.title);
  });

  test('stays inside windows across a DST change', () => {
    const p = buildReminderPlan(at(2026, 10, 20, 0, 0));
    for (const r of p) {
      const w = REMINDER_WINDOWS.find((x) => x.name === r.slot)!;
      expect(minuteOf(r.at)).toBeGreaterThanOrEqual(w.from);
      expect(minuteOf(r.at)).toBeLessThanOrEqual(w.to);
    }
  });
});

describe('REMINDER_COPY', () => {
  test('has 14 messages per slot, enough for a full plan', () => {
    for (const slot of REMINDER_WINDOWS) expect(REMINDER_COPY[slot.name]).toHaveLength(14);
  });

  test('titles are short and unique per slot', () => {
    for (const slot of REMINDER_WINDOWS) {
      const titles = REMINDER_COPY[slot.name].map((c) => c.title);
      expect(new Set(titles).size).toBe(titles.length);
      expect(titles.every((t) => t.length > 0 && t.length <= 32)).toBe(true);
    }
  });

  test('bodies are short enough for a lock-screen banner', () => {
    for (const slot of REMINDER_WINDOWS) {
      expect(REMINDER_COPY[slot.name].every((c) => c.body.length > 0 && c.body.length <= 80)).toBe(true);
    }
  });

  test('avoids removed-feature, price and platform claims', () => {
    const all = Object.values(REMINDER_COPY)
      .flat()
      .map((c) => `${c.title} ${c.body}`)
      .join(' ');
    expect(all).not.toMatch(/\b(remember|memory|memories|saved your|free|android|chatgpt|openai)\b/i);
  });
});
