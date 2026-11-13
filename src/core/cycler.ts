import { pickRandom } from "./presetPool";

export type AutoSource = "timer" | "song" | "beat";

export type Intent =
  | { type: "auto"; source: AutoSource }
  | { type: "random" }
  | { type: "prev" }
  | { type: "select"; name: string }
  | { type: "skip" }
  | { type: "failed" }
  | { type: "lock" };

export interface CyclerState {
  history: string[];
  cursor: number;
  locked: boolean;
  lastSwitchAt: number;
}

export interface CyclerContext {
  now: number;
  pool: readonly string[];
  rng: () => number;
  intervalMs: number;
}

export interface Load {
  name: string;
  /** Seconds butterchurn spends crossfading into the new preset. */
  blend: number;
}

export interface Decision {
  state: CyclerState;
  load?: Load;
}

export const BLEND = Object.freeze({ timer: 2.7, song: 2.0, beat: 0.5, manual: 1.0, failed: 0 });
export const SONG_DEBOUNCE_MS = 3_000;
export const BEAT_DWELL_MS = 20_000;
export const HISTORY_LIMIT = 50;

export function initialState(selected: string, now: number): CyclerState {
  return { history: [selected], cursor: 0, locked: false, lastSwitchAt: now };
}

export function currentPreset(state: CyclerState): string | undefined {
  return state.history[state.cursor];
}

function navigateTo(state: CyclerState, name: string, blend: number, now: number): Decision {
  if (name === currentPreset(state)) return { state };
  const history = [...state.history.slice(0, state.cursor + 1), name].slice(-HISTORY_LIMIT);
  return {
    state: { ...state, history, cursor: history.length - 1, lastSwitchAt: now },
    load: { name, blend },
  };
}

function advance(state: CyclerState, context: CyclerContext, blend: number): Decision {
  const recent = state.history.slice(0, state.cursor + 1);
  const next = pickRandom(context.pool, recent, context.rng);
  if (next === null) return { state };
  return navigateTo(state, next, blend, context.now);
}

/** Minimum time since the last switch before each automatic source may switch again. */
function autoGapMs(source: AutoSource, context: CyclerContext): number {
  if (source === "timer") return context.intervalMs;
  if (source === "song") return SONG_DEBOUNCE_MS;
  return BEAT_DWELL_MS;
}

/** Single place where every trigger is arbitrated: lock, dwell, history and blend. */
export function decide(state: CyclerState, intent: Intent, context: CyclerContext): Decision {
  switch (intent.type) {
    case "auto": {
      if (state.locked) return { state };
      if (context.now - state.lastSwitchAt < autoGapMs(intent.source, context)) return { state };
      return advance(state, context, BLEND[intent.source]);
    }
    case "random":
    case "skip":
      return advance(state, context, BLEND.manual);
    case "failed":
      return advance(state, context, BLEND.failed);
    case "prev": {
      if (state.cursor === 0) return { state };
      const cursor = state.cursor - 1;
      return {
        state: { ...state, cursor, lastSwitchAt: context.now },
        load: { name: state.history[cursor], blend: BLEND.manual },
      };
    }
    case "select":
      return navigateTo(state, intent.name, BLEND.manual, context.now);
    case "lock":
      return { state: { ...state, locked: !state.locked } };
  }
}
