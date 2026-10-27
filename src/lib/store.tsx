import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_TEMP, SNOOZE_MINUTES, STEPS } from '../config/bake-plan';
import { cancelAlarm, consumePendingActions, scheduleAlarm, stopRinging } from '../../modules/handbake-alarm';
import { clock } from './format';
import { computePlan, isFinished, isOff } from './plan';
import type { AppData, Bake } from './types';

const KEY = 'handbake-data-v1';
const EMPTY: AppData = { version: 1, bakes: [], silent: false, defaults: null };

type Store = {
  ready: boolean;
  data: AppData;
  bake(id: string): Bake | undefined;
  createBake(): Bake;
  updateBake(id: string, fn: (b: Bake) => Bake): void;
  deleteBake(id: string): void;
  logStep(id: string, stepId: string, at?: number): void;
  setSilent(silent: boolean): void;
  saveDefaults(b: Bake): void;
  resetDefaults(): void;
};

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Current time, refreshed every `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function withLog(b: Bake, stepId: string, at: number): Bake {
  const step = STEPS.find((s) => s.id === stepId);
  if (!step || b.logs[stepId] || isOff(b, step)) return b;
  const logs = { ...b.logs, [stepId]: { at, note: b.notes[stepId] ?? '' } };
  const notes = { ...b.notes };
  delete notes[stepId];
  // Feeding the starter is the start of the bake.
  return { ...b, logs, notes, start: stepId === STEPS[0].id ? at : b.start };
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Keep the phone's alarm for each bake in line with its next step. */
function syncAlarms(data: AppData, known: Set<string>) {
  const now = Date.now();
  const live = new Set<string>();
  for (const b of data.bakes) {
    if (isFinished(b)) continue;
    const p = computePlan(b, now);
    const r = p.rows[p.cur];
    if (!r) continue;
    live.add(b.id);
    scheduleAlarm({
      key: b.id,
      stepId: r.step.id,
      at: Math.round(r.planned / 1000) * 1000,
      title: r.step.name,
      body: b.name + ' · due ' + clock(r.planned),
      silent: data.silent,
      snoozeMinutes: SNOOZE_MINUTES,
    });
  }
  for (const id of known) if (!live.has(id)) cancelAlarm(id);
  known.clear();
  live.forEach((id) => known.add(id));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const scheduled = useRef(new Set<string>());

  const applyPending = useCallback(() => {
    const actions = consumePendingActions();
    if (!actions.length) return;
    setData((d) => ({
      ...d,
      bakes: d.bakes.map((b) => actions.filter((a) => a.type === 'log' && a.key === b.id).reduce((x, a) => withLog(x, a.stepId, a.at), b)),
    }));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData({ ...EMPTY, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => {
        setReady(true);
        applyPending();
      });
  }, [applyPending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') applyPending();
    });
    return () => sub.remove();
  }, [applyPending]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
    syncAlarms(data, scheduled.current);
  }, [data, ready]);

  const updateBake = useCallback((id: string, fn: (b: Bake) => Bake) => {
    setData((d) => ({ ...d, bakes: d.bakes.map((b) => (b.id === id ? fn(b) : b)) }));
  }, []);

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      bake: (id) => data.bakes.find((b) => b.id === id),
      createBake: () => {
        const now = Date.now();
        const def = data.defaults;
        const b: Bake = {
          id: newId(),
          name: 'New bread',
          createdAt: now,
          start: Math.ceil(now / 300_000) * 300_000,
          temp: def?.temp ?? DEFAULT_TEMP,
          durs: { ...(def?.durs ?? {}) },
          skips: { ...(def?.skips ?? {}) },
          logs: {},
          notes: {},
        };
        setData((d) => ({ ...d, bakes: [b, ...d.bakes] }));
        return b;
      },
      updateBake,
      deleteBake: (id) => setData((d) => ({ ...d, bakes: d.bakes.filter((b) => b.id !== id) })),
      logStep: (id, stepId, at = Date.now()) => {
        stopRinging();
        updateBake(id, (b) => withLog(b, stepId, at));
      },
      setSilent: (silent) => setData((d) => ({ ...d, silent })),
      saveDefaults: (b) => setData((d) => ({ ...d, defaults: { durs: { ...b.durs }, skips: { ...b.skips }, temp: b.temp, savedAt: Date.now() } })),
      resetDefaults: () => setData((d) => ({ ...d, defaults: null })),
    }),
    [data, ready, updateBake],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
