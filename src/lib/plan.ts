import { KITCHEN_TEMPS, STEPS, type StepConfig } from '../config/bake-plan';
import type { Bake } from './types';

const MIN = 60_000;

/** A step as it applies to one bake, after autolyse and proof swaps. */
export type StepView = {
  id: string;
  name: string;
  action: string;
  minutes: number;
  adjust: number;
  typical?: string;
  about: string;
  skip: StepConfig['skip'];
  overlap?: StepConfig['overlap'];
  ferment?: boolean;
  group?: StepConfig['group'];
  waitLabel?: string;
  swapped: boolean;
};

export type Status = 'done' | 'skipped' | 'current' | 'upcoming';

export type Row = {
  step: StepView;
  index: number;
  /** Effective duration in minutes (0 when a waiting step is skipped). */
  dur: number;
  /** Minutes this step starts before the previous one ends. */
  ov: number;
  /** When the step should start according to the plan, epoch ms. */
  planned: number;
  /** When it started (logged) or will start, epoch ms. A late current step starts "now". */
  start: number;
  status: Status;
  /** Minutes late, for the current step. */
  late: number;
  log?: Bake['logs'][string];
};

export type Plan = {
  rows: Row[];
  /** Index of the next step to log, or -1 when everything is logged or skipped. */
  cur: number;
  started: boolean;
  /** When the last step (slice) starts. */
  end: number;
};

export function durKey(s: StepView) {
  return s.swapped ? s.id + '-alt' : s.id;
}

export function viewOf(s: StepConfig, skips: Record<string, boolean>): StepView {
  let v: StepView = { ...s, swapped: false };
  if (s.ifAutolyseSkipped && skips.autolyse) v = { ...v, ...s.ifAutolyseSkipped };
  if (skips[s.id] && s.skip === 'swap' && s.swap) v = { ...v, ...s.swap, waitLabel: undefined, swapped: true };
  return v;
}

export function tempFactor(temp: number) {
  return (KITCHEN_TEMPS.find((t) => t.celsius === temp) ?? { factor: 1 }).factor;
}

export function baseDur(bake: Bake, s: StepView) {
  return bake.durs[durKey(s)] ?? s.minutes;
}

export function effDur(bake: Bake, s: StepView) {
  const b = baseDur(bake, s);
  return s.ferment ? Math.round((b * tempFactor(bake.temp)) / 5) * 5 : b;
}

/** True when the step is switched off (a swapped proof still runs, so it is not "off"). */
export function isOff(bake: Bake, s: StepConfig) {
  return !!bake.skips[s.id] && s.skip !== 'swap';
}

export function computePlan(bake: Bake, now: number): Plan {
  const started = Object.keys(bake.logs).length > 0;
  const cur = STEPS.findIndex((s) => !bake.logs[s.id] && !isOff(bake, s));
  const rows: Row[] = [];
  let prev: { start: number; dur: number } | null = null;
  STEPS.forEach((s, i) => {
    const v = viewOf(s, bake.skips);
    const off = isOff(bake, s);
    const dur = off && s.skip === 'collapse' ? 0 : effDur(bake, v);
    // An overlap never reaches back further than the previous step lasts.
    const ov = prev ? Math.min(s.overlap === 'own' ? dur : (s.overlap ?? 0), prev.dur) : 0;
    const planned = prev ? prev.start + (prev.dur - ov) * MIN : bake.start;
    const log = bake.logs[s.id];
    let start = planned;
    let status: Status = 'upcoming';
    let late = 0;
    if (log) {
      start = log.at;
      status = 'done';
    } else if (off) status = 'skipped';
    else if (i === cur) {
      status = 'current';
      if (started && now > planned + 30_000) {
        late = (now - planned) / MIN;
        start = now;
      }
    }
    rows.push({ step: v, index: i, dur, ov, planned, start, status, late, log });
    prev = { start, dur };
  });
  return { rows, cur, started, end: rows[rows.length - 1].start };
}

export function isFinished(bake: Bake) {
  return STEPS.every((s) => bake.logs[s.id] || isOff(bake, s));
}

/** Days (local yyyy-mm-dd) a bake was active on. */
export function activeDays(bake: Bake, now: number) {
  const p = computePlan(bake, now);
  const first = new Date(p.rows[0].start);
  const last = new Date(p.end);
  const days: string[] = [];
  const d = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  while (d.getTime() <= last.getTime()) {
    days.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function ymd(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
