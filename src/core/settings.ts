export type Sensitivity = "low" | "medium" | "high";

export interface Settings {
  selected: string;
  renderScale: number;
  favorites: string[];
  blocklist: string[];
  autoCycle: boolean;
  intervalSec: number;
  onSongChange: boolean;
  onBeat: boolean;
  beatSensitivity: Sensitivity;
  favoritesOnly: boolean;
  showHud: boolean;
  noticeSeen: boolean;
}

export const SETTINGS_KEY = "bcplus-settings";
export const DEFAULT_PRESET = "Flexi, martin + geiss - dedicated to the sherwin maxawow";

export const DEFAULTS: Readonly<Settings> = Object.freeze({
  selected: DEFAULT_PRESET,
  renderScale: 1,
  favorites: [],
  blocklist: [],
  autoCycle: true,
  intervalSec: 30,
  onSongChange: true,
  onBeat: true,
  beatSensitivity: "medium",
  favoritesOnly: false,
  showHud: true,
  noticeSeen: false,
});

const SENSITIVITIES: readonly Sensitivity[] = ["low", "medium", "high"];

type StorageGetter = (key: string) => string | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const strings = value.filter((entry): entry is string => typeof entry === "string");
  return [...new Set(strings)];
}

/** Validate every field independently so one bad value never resets the rest. */
export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return { ...DEFAULTS, favorites: [], blocklist: [] };
  return {
    selected: readString(raw.selected, DEFAULTS.selected),
    renderScale: readNumber(raw.renderScale, DEFAULTS.renderScale, 0.25, 2),
    favorites: readStringList(raw.favorites),
    blocklist: readStringList(raw.blocklist),
    autoCycle: readBoolean(raw.autoCycle, DEFAULTS.autoCycle),
    intervalSec: readNumber(raw.intervalSec, DEFAULTS.intervalSec, 5, 300),
    onSongChange: readBoolean(raw.onSongChange, DEFAULTS.onSongChange),
    onBeat: readBoolean(raw.onBeat, DEFAULTS.onBeat),
    beatSensitivity: SENSITIVITIES.includes(raw.beatSensitivity as Sensitivity)
      ? (raw.beatSensitivity as Sensitivity)
      : DEFAULTS.beatSensitivity,
    favoritesOnly: readBoolean(raw.favoritesOnly, DEFAULTS.favoritesOnly),
    showHud: readBoolean(raw.showHud, DEFAULTS.showHud),
    noticeSeen: readBoolean(raw.noticeSeen, DEFAULTS.noticeSeen),
  };
}

function parseJson(text: string | null): unknown {
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Pull settings out of the upstream plugin's localStorage keys. */
export function migrateLegacy(get: StorageGetter): Partial<Settings> {
  const migrated: Partial<Settings> = {};
  const selected = get("bc-selected");
  if (selected) migrated.selected = selected;
  const scale = Number.parseFloat(get("bc-scale") ?? "");
  if (Number.isFinite(scale)) migrated.renderScale = scale;
  const favorites = parseJson(get("viz-favorites"));
  if (Array.isArray(favorites)) migrated.favorites = readStringList(favorites);
  if (get("bc-notice")) migrated.noticeSeen = true;
  return migrated;
}

export function loadSettings(get: StorageGetter): Settings {
  const stored = get(SETTINGS_KEY);
  if (stored !== null) return parseSettings(parseJson(stored));
  return parseSettings(migrateLegacy(get));
}
