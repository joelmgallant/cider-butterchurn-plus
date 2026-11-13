import type { Sensitivity } from "./settings";

export interface DetectorState {
  short: number;
  long: number;
  armed: boolean;
  lastDropAt: number;
  initialized: boolean;
}

/** short / long ratio that counts as a drop. */
export const SENSITIVITY_RATIO: Readonly<Record<Sensitivity, number>> = { low: 2.0, medium: 1.6, high: 1.35 };

const SHORT_TAU_MS = 150;
const LONG_TAU_MS = 6_000;
/** short must fall back under long * this before another drop can fire. */
const REARM_RATIO = 1.1;
/** Below this short-term energy nothing counts as a drop. */
const ENERGY_FLOOR = 0.25;
const REFRACTORY_MS = 2_000;

export function createDetector(): DetectorState {
  return { short: 0, long: 0, armed: true, lastDropAt: -Infinity, initialized: false };
}

function ema(previous: number, value: number, dtMs: number, tauMs: number): number {
  const alpha = 1 - Math.exp(-dtMs / tauMs);
  return previous + alpha * (value - previous);
}

/**
 * Detects "drops": short-term bass energy jumping well above its long-term average.
 * A sustained loud section fires once; the detector re-arms after the jump subsides.
 */
export function stepDetector(
  state: DetectorState,
  energy: number,
  dtMs: number,
  nowMs: number,
  sensitivity: Sensitivity,
): { state: DetectorState; drop: boolean } {
  if (!state.initialized) {
    return { state: { ...state, short: energy, long: energy, initialized: true }, drop: false };
  }
  const short = ema(state.short, energy, dtMs, SHORT_TAU_MS);
  const long = ema(state.long, energy, dtMs, LONG_TAU_MS);
  const ratio = long > 0 ? short / long : short > 0 ? Infinity : 0;

  const drop =
    state.armed &&
    short >= ENERGY_FLOOR &&
    ratio >= SENSITIVITY_RATIO[sensitivity] &&
    nowMs - state.lastDropAt >= REFRACTORY_MS;

  const armed = drop ? false : state.armed || ratio < REARM_RATIO;
  return {
    state: { short, long, armed, lastDropAt: drop ? nowMs : state.lastDropAt, initialized: true },
    drop,
  };
}
