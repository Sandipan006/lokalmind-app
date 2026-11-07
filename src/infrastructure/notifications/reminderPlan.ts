import { REMINDER_COPY, type ReminderCopy } from './reminderCopy';

export type ReminderSlotName = 'morning' | 'midday' | 'evening' | 'night';

/**
 * Local-time windows (minutes after midnight), outside sleep hours: commute, lunch,
 * after work, wind-down. A reminder lands at a different minute inside its window each day.
 */
export const REMINDER_WINDOWS: readonly { name: ReminderSlotName; from: number; to: number }[] = [
  { name: 'morning', from: 8 * 60 + 30, to: 10 * 60 + 30 },
  { name: 'midday', from: 12 * 60, to: 14 * 60 },
  { name: 'evening', from: 17 * 60 + 30, to: 19 * 60 + 30 },
  { name: 'night', from: 20 * 60 + 30, to: 21 * 60 + 45 },
];

/** 3-4 a day, about 15 days. iOS keeps at most 64 pending local notifications; 56 leaves headroom. */
export const REMINDER_TOTAL = 56;

/** Skip slots closer than this, so the first reminder never lands right after the user leaves. */
export const REMINDER_MIN_LEAD_MS = 2 * 60 * 60 * 1000;

export const REMINDER_ID_PREFIX = 'lm-reminder-';

export interface PlannedReminder {
  id: string;
  at: Date;
  slot: ReminderSlotName;
  copy: ReminderCopy;
}

/** Small seeded generator: same seed, same numbers, so tests and same-day reschedules are stable. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Minute of day per window for one calendar day; 3 or 4 of them are kept. Seeded by the date only. */
function planDay(date: Date): { name: ReminderSlotName; minute: number }[] {
  const rand = mulberry32(date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate());
  const dropOne = rand() < 0.5;
  const dropIndex = Math.floor(rand() * REMINDER_WINDOWS.length);
  return REMINDER_WINDOWS.map((w, i) => ({
    name: w.name,
    minute: w.from + Math.floor(rand() * (w.to - w.from + 1)),
    skip: dropOne && i === dropIndex,
  }))
    .filter((w) => !w.skip)
    .map(({ name, minute }) => ({ name, minute }));
}

/**
 * Next `total` reminders after `now`, in time order. Pure: same input gives the same plan.
 * Each day gets 3-4 reminders at varying times. Copy rotates per slot (no repeat for 14
 * uses); `seed` shifts the start so a plan built on another day opens with different text.
 */
export function buildReminderPlan(now: Date, total: number = REMINDER_TOTAL): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  const used: Record<ReminderSlotName, number> = { morning: 0, midday: 0, evening: 0, night: 0 };
  const seed = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);

  for (let day = 0; plan.length < total; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    for (const slot of planDay(date)) {
      if (plan.length >= total) break;
      // Local-time constructor keeps the wall-clock time across DST changes.
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, slot.minute);
      if (at.getTime() - now.getTime() < REMINDER_MIN_LEAD_MS) continue;
      const pool = REMINDER_COPY[slot.name];
      const copy = pool[(used[slot.name] + seed) % pool.length] as ReminderCopy;
      used[slot.name] += 1;
      plan.push({ id: `${REMINDER_ID_PREFIX}${plan.length}`, at, slot: slot.name, copy });
    }
  }
  return plan;
}
