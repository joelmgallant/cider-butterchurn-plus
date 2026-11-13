import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  DEFAULT_PRESET,
  SETTINGS_KEY,
  loadSettings,
  migrateLegacy,
  parseSettings,
} from "../src/core/settings";

function storage(entries: Record<string, string>) {
  return (key: string) => (key in entries ? entries[key] : null);
}

describe("parseSettings", () => {
  it("returns defaults for non-objects", () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings("nope")).toEqual(DEFAULTS);
    expect(parseSettings([1, 2])).toEqual(DEFAULTS);
  });

  it("has the spec defaults", () => {
    expect(DEFAULTS).toMatchObject({
      selected: DEFAULT_PRESET,
      autoCycle: true,
      intervalSec: 30,
      onSongChange: true,
      onBeat: true,
      beatSensitivity: "medium",
      favoritesOnly: false,
      renderScale: 1,
    });
  });

  it("keeps valid fields and replaces only the invalid ones", () => {
    const parsed = parseSettings({
      intervalSec: "banana",
      onBeat: false,
      favorites: ["A", 3, "B"],
      beatSensitivity: "extreme",
    });
    expect(parsed.intervalSec).toBe(DEFAULTS.intervalSec);
    expect(parsed.onBeat).toBe(false);
    expect(parsed.favorites).toEqual(["A", "B"]);
    expect(parsed.beatSensitivity).toBe("medium");
  });

  it("clamps numeric ranges", () => {
    expect(parseSettings({ intervalSec: 1 }).intervalSec).toBe(5);
    expect(parseSettings({ intervalSec: 9999 }).intervalSec).toBe(300);
    expect(parseSettings({ renderScale: 0.01 }).renderScale).toBe(0.25);
    expect(parseSettings({ renderScale: 7 }).renderScale).toBe(2);
  });

  it("dedupes string lists", () => {
    expect(parseSettings({ blocklist: ["X", "X", "Y"] }).blocklist).toEqual(["X", "Y"]);
  });
});

describe("migrateLegacy", () => {
  it("reads the upstream bc-* and viz-favorites keys", () => {
    const legacy = migrateLegacy(
      storage({
        "bc-selected": "Some preset",
        "bc-scale": "0.5",
        "viz-favorites": JSON.stringify(["Fav 1", "Fav 2"]),
        "bc-notice": "1",
      }),
    );
    expect(legacy).toEqual({
      selected: "Some preset",
      renderScale: 0.5,
      favorites: ["Fav 1", "Fav 2"],
      noticeSeen: true,
    });
  });

  it("ignores corrupt legacy favourites", () => {
    expect(migrateLegacy(storage({ "viz-favorites": "{not json" }))).toEqual({});
  });
});

describe("loadSettings", () => {
  it("prefers the new key over legacy keys", () => {
    const loaded = loadSettings(
      storage({
        [SETTINGS_KEY]: JSON.stringify({ intervalSec: 60 }),
        "bc-selected": "Legacy",
      }),
    );
    expect(loaded.intervalSec).toBe(60);
    expect(loaded.selected).toBe(DEFAULT_PRESET);
  });

  it("migrates when the new key is absent", () => {
    expect(loadSettings(storage({ "bc-selected": "Legacy" })).selected).toBe("Legacy");
  });

  it("survives corrupt JSON in the new key", () => {
    expect(loadSettings(storage({ [SETTINGS_KEY]: "{oops" }))).toEqual(DEFAULTS);
  });
});
