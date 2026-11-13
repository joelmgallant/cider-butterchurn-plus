import { describe, expect, it } from "vitest";
import {
  BLEND,
  BEAT_DWELL_MS,
  HISTORY_LIMIT,
  SONG_DEBOUNCE_MS,
  decide,
  initialState,
  type CyclerContext,
  type CyclerState,
} from "../src/core/cycler";

const POOL = ["a", "b", "c", "d", "e"];

function ctx(now: number, extra: Partial<CyclerContext> = {}): CyclerContext {
  return { now, pool: POOL, rng: () => 0, intervalMs: 30_000, ...extra };
}

function state(overrides: Partial<CyclerState> = {}): CyclerState {
  return { ...initialState("a", 0), ...overrides };
}

describe("initialState", () => {
  it("starts with the selected preset in history", () => {
    expect(initialState("a", 5)).toEqual({ history: ["a"], cursor: 0, locked: false, lastSwitchAt: 5 });
  });
});

describe("timer", () => {
  it("does nothing before the interval elapses", () => {
    expect(decide(state(), { type: "auto", source: "timer" }, ctx(29_999)).load).toBeUndefined();
  });

  it("advances once the interval elapses, with the timer blend", () => {
    const result = decide(state(), { type: "auto", source: "timer" }, ctx(30_000));
    expect(result.load).toEqual({ name: "b", blend: BLEND.timer });
    expect(result.state.lastSwitchAt).toBe(30_000);
  });

  it("is reset by any other switch", () => {
    const afterSong = decide(state(), { type: "auto", source: "song" }, ctx(25_000)).state;
    expect(decide(afterSong, { type: "auto", source: "timer" }, ctx(30_000)).load).toBeUndefined();
    expect(decide(afterSong, { type: "auto", source: "timer" }, ctx(55_000)).load).toBeDefined();
  });
});

describe("song change", () => {
  it("advances with the song blend", () => {
    expect(decide(state(), { type: "auto", source: "song" }, ctx(10_000)).load).toEqual({
      name: "b",
      blend: BLEND.song,
    });
  });

  it("is debounced right after a switch", () => {
    const s = state({ lastSwitchAt: 10_000 });
    expect(decide(s, { type: "auto", source: "song" }, ctx(10_000 + SONG_DEBOUNCE_MS - 1)).load).toBeUndefined();
    expect(decide(s, { type: "auto", source: "song" }, ctx(10_000 + SONG_DEBOUNCE_MS)).load).toBeDefined();
  });
});

describe("beat", () => {
  it("respects the dwell time", () => {
    const s = state({ lastSwitchAt: 0 });
    expect(decide(s, { type: "auto", source: "beat" }, ctx(BEAT_DWELL_MS - 1)).load).toBeUndefined();
    expect(decide(s, { type: "auto", source: "beat" }, ctx(BEAT_DWELL_MS)).load).toEqual({
      name: "b",
      blend: BLEND.beat,
    });
  });
});

describe("lock", () => {
  const locked = state({ locked: true });

  it("toggles without loading", () => {
    const result = decide(state(), { type: "lock" }, ctx(1));
    expect(result.state.locked).toBe(true);
    expect(result.load).toBeUndefined();
    expect(decide(result.state, { type: "lock" }, ctx(2)).state.locked).toBe(false);
  });

  it.each(["timer", "song", "beat"] as const)("blocks %s", (source) => {
    expect(decide(locked, { type: "auto", source }, ctx(999_999)).load).toBeUndefined();
  });

  it("allows manual random and stays locked", () => {
    const result = decide(locked, { type: "random" }, ctx(1));
    expect(result.load).toEqual({ name: "b", blend: BLEND.manual });
    expect(result.state.locked).toBe(true);
  });

  it("allows skip (blocklist) and stays locked", () => {
    const result = decide(locked, { type: "skip" }, ctx(1));
    expect(result.load?.name).toBe("b");
    expect(result.state.locked).toBe(true);
  });
});

describe("manual random", () => {
  it("ignores dwell", () => {
    expect(decide(state({ lastSwitchAt: 100 }), { type: "random" }, ctx(101)).load).toBeDefined();
  });

  it("avoids presets already in history", () => {
    const s = state({ history: ["a", "b", "c"], cursor: 2 });
    expect(decide(s, { type: "random" }, ctx(1)).load?.name).toBe("d");
  });
});

describe("history", () => {
  it("prev walks back", () => {
    const s = state({ history: ["a", "b", "c"], cursor: 2 });
    const result = decide(s, { type: "prev" }, ctx(1));
    expect(result.load).toEqual({ name: "b", blend: BLEND.manual });
    expect(result.state.cursor).toBe(1);
  });

  it("prev at the start is a no-op", () => {
    expect(decide(state(), { type: "prev" }, ctx(1)).load).toBeUndefined();
  });

  it("navigating after prev truncates forward entries", () => {
    const back = decide(state({ history: ["a", "b", "c"], cursor: 2 }), { type: "prev" }, ctx(1)).state;
    const result = decide(back, { type: "select", name: "e" }, ctx(2));
    expect(result.state.history).toEqual(["a", "b", "e"]);
    expect(result.state.cursor).toBe(2);
  });

  it("is capped", () => {
    const long = Array.from({ length: HISTORY_LIMIT }, (_, index) => `p${index}`);
    const result = decide(state({ history: long, cursor: long.length - 1 }), { type: "select", name: "x" }, ctx(1));
    expect(result.state.history).toHaveLength(HISTORY_LIMIT);
    expect(result.state.history.at(-1)).toBe("x");
    expect(result.state.cursor).toBe(HISTORY_LIMIT - 1);
  });
});

describe("select", () => {
  it("loads the named preset with the manual blend", () => {
    expect(decide(state(), { type: "select", name: "c" }, ctx(1)).load).toEqual({ name: "c", blend: BLEND.manual });
  });

  it("selecting the current preset is a no-op", () => {
    expect(decide(state(), { type: "select", name: "a" }, ctx(1)).load).toBeUndefined();
  });
});

describe("failed preset", () => {
  it("advances immediately with no blend, ignoring lock", () => {
    const result = decide(state({ locked: true }), { type: "failed" }, ctx(1));
    expect(result.load).toEqual({ name: "b", blend: BLEND.failed });
  });
});

describe("degenerate pools", () => {
  it("does nothing with an empty pool", () => {
    expect(decide(state(), { type: "random" }, ctx(1, { pool: [] })).load).toBeUndefined();
  });

  it("does nothing when the only candidate is already showing", () => {
    expect(decide(state(), { type: "random" }, ctx(1, { pool: ["a"] })).load).toBeUndefined();
  });
});

describe("preferred (prewarmed) next preset", () => {
  it("advances to the preferred preset when it is eligible", () => {
    expect(decide(state(), { type: "random" }, ctx(1, { preferred: "d" })).load?.name).toBe("d");
    expect(decide(state(), { type: "auto", source: "timer" }, ctx(30_000, { preferred: "e" })).load?.name).toBe("e");
  });

  it("ignores a preferred preset that left the pool", () => {
    expect(decide(state(), { type: "random" }, ctx(1, { preferred: "zz" })).load?.name).toBe("b");
  });

  it("ignores a preferred preset that is already showing", () => {
    expect(decide(state(), { type: "random" }, ctx(1, { preferred: "a" })).load?.name).toBe("b");
  });

  it("does not affect prev or select", () => {
    const s = state({ history: ["a", "b"], cursor: 1 });
    expect(decide(s, { type: "prev" }, ctx(1, { preferred: "e" })).load?.name).toBe("a");
    expect(decide(s, { type: "select", name: "c" }, ctx(1, { preferred: "e" })).load?.name).toBe("c");
  });

  it("still respects lock and dwell", () => {
    expect(decide(state({ locked: true }), { type: "auto", source: "timer" }, ctx(99_999, { preferred: "d" })).load).toBeUndefined();
    expect(decide(state(), { type: "auto", source: "beat" }, ctx(1, { preferred: "d" })).load).toBeUndefined();
  });
});
