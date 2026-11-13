export interface PoolOptions {
  blocklist: readonly string[];
  favorites: readonly string[];
  favoritesOnly: boolean;
  /** Presets that failed to load this session. */
  skip?: ReadonlySet<string>;
}

export type PoolFallback = "none" | "all-minus-blocklist" | "all";

export interface EligibleResult {
  pool: string[];
  fallback: PoolFallback;
}

export const NO_REPEAT_WINDOW = 20;

/** Presets auto-cycle may choose from, widening the filter rather than returning nothing. */
export function eligiblePresets(all: readonly string[], options: PoolOptions): EligibleResult {
  const blocked = new Set(options.blocklist);
  const skipped = options.skip ?? new Set<string>();
  const allowed = all.filter((name) => !blocked.has(name) && !skipped.has(name));

  if (options.favoritesOnly) {
    const favorites = new Set(options.favorites);
    const favoritePool = allowed.filter((name) => favorites.has(name));
    if (favoritePool.length > 0) return { pool: favoritePool, fallback: "none" };
    if (allowed.length > 0) return { pool: allowed, fallback: "all-minus-blocklist" };
    return { pool: [...all], fallback: "all" };
  }

  if (allowed.length > 0) return { pool: allowed, fallback: "none" };
  return { pool: [...all], fallback: "all" };
}

/** Random preset that is not among the most recently shown ones. */
export function pickRandom(
  pool: readonly string[],
  recent: readonly string[],
  rng: () => number,
  window: number = NO_REPEAT_WINDOW,
): string | null {
  if (pool.length === 0) return null;
  const effectiveWindow = Math.min(window, pool.length - 1);
  const avoided = new Set(effectiveWindow > 0 ? recent.slice(-effectiveWindow) : []);
  const candidates = pool.filter((name) => !avoided.has(name));
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index];
}
