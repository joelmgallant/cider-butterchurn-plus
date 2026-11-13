import { describe, expect, it } from "vitest";
import { eligiblePresets, pickRandom } from "../src/core/presetPool";

const ALL = ["a", "b", "c", "d", "e"];
const none = { blocklist: [], favorites: [], favoritesOnly: false };

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("eligiblePresets", () => {
  it("returns everything by default", () => {
    expect(eligiblePresets(ALL, none)).toEqual({ pool: ALL, fallback: "none" });
  });

  it("removes blocklisted presets", () => {
    expect(eligiblePresets(ALL, { ...none, blocklist: ["b", "d"] }).pool).toEqual(["a", "c", "e"]);
  });

  it("restricts to favourites when favouritesOnly is on", () => {
    const result = eligiblePresets(ALL, { ...none, favorites: ["c", "a", "zz"], favoritesOnly: true });
    expect(result.pool).toEqual(["a", "c"]);
  });

  it("blocklist beats favourites", () => {
    const result = eligiblePresets(ALL, { blocklist: ["a"], favorites: ["a", "c"], favoritesOnly: true });
    expect(result.pool).toEqual(["c"]);
  });

  it("skips session-failed presets", () => {
    expect(eligiblePresets(ALL, { ...none, skip: new Set(["a"]) }).pool).toEqual(["b", "c", "d", "e"]);
  });

  it("falls back to all-minus-blocklist when favourites-only is empty", () => {
    const result = eligiblePresets(ALL, { blocklist: ["e"], favorites: [], favoritesOnly: true });
    expect(result).toEqual({ pool: ["a", "b", "c", "d"], fallback: "all-minus-blocklist" });
  });

  it("falls back to everything when the blocklist covers all", () => {
    const result = eligiblePresets(ALL, { ...none, blocklist: ALL });
    expect(result).toEqual({ pool: ALL, fallback: "all" });
  });
});

describe("pickRandom", () => {
  it("returns null for an empty pool", () => {
    expect(pickRandom([], [], Math.random)).toBeNull();
  });

  it("returns the only preset of a one-item pool even if recent", () => {
    expect(pickRandom(["a"], ["a"], Math.random)).toBe("a");
  });

  it("never picks something in the recent window", () => {
    const pick = pickRandom(ALL, ["a", "b", "c"], sequence(0));
    expect(pick).toBe("d");
  });

  it("uses the rng over the remaining candidates", () => {
    expect(pickRandom(ALL, ["a"], sequence(0.99))).toBe("e");
  });

  it("caps the window at pool size minus one", () => {
    // window 20 but pool of 3: only the last 2 recent are excluded
    expect(pickRandom(["a", "b", "c"], ["a", "b", "c"], sequence(0))).toBe("a");
  });

  it("respects a custom window", () => {
    expect(pickRandom(ALL, ["a", "b", "c", "d"], sequence(0), 1)).toBe("a");
  });
});
