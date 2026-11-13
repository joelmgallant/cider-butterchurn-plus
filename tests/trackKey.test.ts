import { describe, expect, it } from "vitest";
import { trackKey } from "../src/core/trackKey";

describe("trackKey", () => {
  it("prefers the item id", () => {
    expect(trackKey({ id: "123", attributes: { name: "A" } })).toBe("id:123");
  });

  it("falls back to playParams id", () => {
    expect(trackKey({ attributes: { playParams: { id: "p9" } } })).toBe("id:p9");
  });

  it("falls back to name + artist", () => {
    expect(trackKey({ attributes: { name: "Song", artistName: "Band" } })).toBe("meta:Song|Band");
  });

  it("returns null for nothing playing", () => {
    expect(trackKey(null)).toBeNull();
    expect(trackKey(undefined)).toBeNull();
    expect(trackKey({})).toBeNull();
  });
});
