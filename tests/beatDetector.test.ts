import { describe, expect, it } from "vitest";
import { bassEnergy } from "../src/core/bassEnergy";
import { createDetector, stepDetector, type DetectorState } from "../src/core/beatDetector";
import type { Sensitivity } from "../src/core/settings";

const FRAME_MS = 1000 / 60;

/** Feed a series of {seconds, energy} segments and return drop times in ms. */
function run(segments: Array<[seconds: number, energy: number | ((ms: number) => number)]>, sensitivity: Sensitivity = "medium") {
  let state: DetectorState = createDetector();
  const drops: number[] = [];
  let now = 0;
  for (const [seconds, energy] of segments) {
    const end = now + seconds * 1000;
    while (now < end) {
      const value = typeof energy === "function" ? energy(now) : energy;
      const result = stepDetector(state, value, FRAME_MS, now, sensitivity);
      state = result.state;
      if (result.drop) drops.push(now);
      now += FRAME_MS;
    }
  }
  return drops;
}

describe("bassEnergy", () => {
  it("averages only bins up to the cutoff, skipping DC", () => {
    // 48 kHz, fft 2048 -> 23.4 Hz per bin; bins 1..6 are <= 150 Hz
    const bytes = new Uint8Array(1024);
    bytes[0] = 255; // DC, ignored
    for (let index = 1; index <= 6; index++) bytes[index] = 255;
    bytes[7] = 255; // 164 Hz, above cutoff
    expect(bassEnergy(bytes, 48_000, 2048)).toBeCloseTo(1, 5);
    bytes[3] = 0;
    expect(bassEnergy(bytes, 48_000, 2048)).toBeCloseTo(5 / 6, 5);
  });

  it("is zero for silence or no bass bins", () => {
    expect(bassEnergy(new Uint8Array(1024), 48_000, 2048)).toBe(0);
    expect(bassEnergy(new Uint8Array(4), 48_000, 8)).toBe(0);
  });
});

describe("beatDetector", () => {
  it("ignores silence", () => {
    expect(run([[20, 0]])).toEqual([]);
  });

  it("ignores a steady loud signal from the start", () => {
    expect(run([[20, 0.8]])).toEqual([]);
  });

  it("ignores a steady four-on-the-floor kick pattern", () => {
    const kick = (ms: number) => (ms % 500 < 120 ? 0.75 : 0.3);
    expect(run([[30, kick]])).toEqual([]);
  });

  it("fires once on a quiet-to-loud drop that stays loud", () => {
    const drops = run([[10, 0.1], [20, 0.8]]);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toBeGreaterThanOrEqual(10_000);
    expect(drops[0]).toBeLessThan(10_500);
  });

  it("fires again on a second build and drop", () => {
    expect(run([[10, 0.1], [10, 0.8], [15, 0.1], [10, 0.8]])).toHaveLength(2);
  });

  it("ignores a jump that stays under the loudness floor", () => {
    expect(run([[10, 0.02], [10, 0.15]])).toEqual([]);
  });

  it("orders sensitivities: high fires on smaller jumps than low", () => {
    const small: Array<[number, number]> = [[10, 0.3], [10, 0.45]];
    const medium: Array<[number, number]> = [[10, 0.3], [10, 0.55]];
    expect(run(small, "high")).toHaveLength(1);
    expect(run(small, "medium")).toHaveLength(0);
    expect(run(medium, "medium")).toHaveLength(1);
    expect(run(medium, "low")).toHaveLength(0);
  });
});
