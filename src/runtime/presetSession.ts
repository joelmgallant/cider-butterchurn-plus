import { eligiblePresets, pickRandom, type PoolFallback } from "../core/presetPool";
import { presetNames } from "./engine";
import { settings } from "./settingsStore";

const FAILURES_BEFORE_SKIP = 2;

/** Session-scoped preset state: load failures, pool fallback warnings, and the queued next preset. */
export function createPresetSession(notify: (message: string) => void) {
  const failures = new Map<string, number>();
  const skip = new Set<string>();
  let warnedFallback: PoolFallback = "none";
  let queued: string | undefined;

  function pool(): string[] {
    const result = eligiblePresets(presetNames, { ...settings, skip });
    if (result.fallback !== "none" && result.fallback !== warnedFallback) {
      notify(result.fallback === "all" ? "Every preset is blocked; using all presets" : "No favourites available; using all presets");
    }
    warnedFallback = result.fallback;
    return result.pool;
  }

  return {
    pool,
    queued: () => queued,
    /** Pick the next auto/random preset now so its shaders can be prewarmed. */
    queueNext(recent: readonly string[]): string | undefined {
      queued = pickRandom(pool(), recent, Math.random) ?? undefined;
      return queued;
    },
    recordFailure(name: string, error: unknown) {
      console.error(`[Butterchurn+] preset failed: ${name}`, error);
      const count = (failures.get(name) ?? 0) + 1;
      failures.set(name, count);
      if (count >= FAILURES_BEFORE_SKIP) skip.add(name);
    },
  };
}
