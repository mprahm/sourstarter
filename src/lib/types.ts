export type LogEntry = { at: number; note: string };

export type Bake = {
  id: string;
  name: string;
  createdAt: number;
  /** When the starter is (or was) fed, epoch ms. Locked once the first step is logged. */
  start: number;
  temp: number;
  /** Duration overrides in minutes, keyed by step id ("proof-alt" for the swapped proof). */
  durs: Record<string, number>;
  skips: Record<string, boolean>;
  logs: Record<string, LogEntry>;
  /** Notes typed on steps that are not logged yet. */
  notes: Record<string, string>;
  rating?: number;
};

export type Defaults = {
  durs: Record<string, number>;
  skips: Record<string, boolean>;
  temp: number;
  savedAt: number;
};

export type AppData = {
  version: 1;
  bakes: Bake[];
  silent: boolean;
  defaults: Defaults | null;
};
