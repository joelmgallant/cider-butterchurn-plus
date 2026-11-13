import { AppleMusic, useCiderAudio } from "@ciderapp/pluginkit";
import { currentPreset, decide, initialState, type CyclerState, type Intent } from "../core/cycler";
import type { HotkeyAction } from "../core/hotkeys";
import { trackKey } from "../core/trackKey";
import { openConfig } from "./configModal";
import { createEngine } from "./engine";
import { createHud } from "./hud";
import { createPresetSession } from "./presetSession";
import { settings, toggleInList } from "./settingsStore";
import { startBeatWatcher, startHotkeys, startSongWatcher, startTicker, type Dispose } from "./triggers";

const MAX_CHAINED_FAILURES = 5;

const audio = useCiderAudio();
const engine = createEngine(() => settings.renderScale);
const hud = createHud();
const session = createPresetSession((message) => hud.toast(message));
let cycler: CyclerState = initialState(settings.selected, Date.now());
let disposers: Dispose[] = [];
let waitingForAudio = false;

function readNowPlayingKey(): string | null {
  try {
    return trackKey(AppleMusic.nowPlayingItem as Parameters<typeof trackKey>[0]);
  } catch {
    return null;
  }
}

function describe(name: string): string {
  const marks = [cycler.locked ? "🔒" : "", settings.favorites.includes(name) ? "⭐" : ""].join("");
  return `${marks}${marks ? " " : ""}${name}`;
}

function afterLoad(name: string) {
  settings.selected = name;
  if (settings.showHud) hud.presetName(describe(name));
  const next = session.queueNext(cycler.history.slice(0, cycler.cursor + 1));
  if (next) engine.prewarm(next);
}

function dispatch(intent: Intent, depth = 0) {
  const decision = decide(cycler, intent, {
    now: Date.now(),
    pool: session.pool(),
    rng: Math.random,
    intervalMs: settings.intervalSec * 1000,
    preferred: session.queued(),
  });
  cycler = decision.state;
  if (!decision.load) return;
  const { name, blend } = decision.load;
  try {
    engine.load(name, blend);
    afterLoad(name);
  } catch (error) {
    session.recordFailure(name, error);
    if (depth < MAX_CHAINED_FAILURES) dispatch({ type: "failed" }, depth + 1);
  }
}

function helpStateLine(): string {
  const pool = settings.favoritesOnly ? "favourites only" : "all presets";
  const cycling = settings.autoCycle ? `every ${settings.intervalSec}s` : "timer off";
  return `${cycler.locked ? "🔒 Locked" : "Unlocked"} · ${pool} · ${cycling} · ${settings.blocklist.length} blocked`;
}

function onHotkey(action: HotkeyAction): boolean {
  const name = currentPreset(cycler);
  switch (action) {
    case "random":
      dispatch({ type: "random" });
      return true;
    case "prev":
      dispatch({ type: "prev" });
      return true;
    case "lock":
      dispatch({ type: "lock" });
      hud.toast(cycler.locked ? `🔒 Locked: ${name}` : "🔓 Unlocked");
      return true;
    case "favorite":
      if (!name) return true;
      hud.toast(toggleInList(settings.favorites, name) ? `⭐ Favourited: ${name}` : `Removed favourite: ${name}`);
      return true;
    case "block":
      if (!name) return true;
      if (!settings.blocklist.includes(name)) settings.blocklist.push(name);
      hud.toast(`🚫 Blocked (${settings.blocklist.length} total): ${name}`);
      dispatch({ type: "skip" });
      return true;
    case "hud":
      settings.showHud = !settings.showHud;
      if (settings.showHud && name) hud.presetName(describe(name));
      else hud.hidePresetName();
      return true;
    case "help":
      hud.setHelp(!hud.isHelpOpen(), helpStateLine());
      return true;
    case "close":
      if (!hud.isHelpOpen()) return false;
      hud.setHelp(false);
      return true;
  }
}

function startTriggers(context: AudioContext, source: AudioNode) {
  disposers = [
    startTicker(() => {
      if (settings.autoCycle) dispatch({ type: "auto", source: "timer" });
    }),
    startSongWatcher(readNowPlayingKey, () => {
      if (settings.onSongChange) dispatch({ type: "auto", source: "song" });
    }),
    startBeatWatcher(
      context,
      source,
      { enabled: () => settings.onBeat, sensitivity: () => settings.beatSensitivity },
      () => dispatch({ type: "auto", source: "beat" }),
    ),
    startHotkeys(onHotkey),
  ];
}

function waitForAudio() {
  if (waitingForAudio) return;
  waitingForAudio = true;
  hud.toast("Visualizer will start when Cider Audio is ready (requires Cider Audio enabled)");
  audio.subscribe(
    "ready",
    () => {
      waitingForAudio = false;
      start();
    },
    { once: true },
  );
}

export function isRunning(): boolean {
  return engine.isRunning();
}

export function start() {
  if (engine.isRunning()) return;
  const { context, source } = audio;
  if (!context || !source) return waitForAudio();
  engine.start(context, source, document.querySelector(".player-modal") !== null);
  cycler = initialState(settings.selected, Date.now());
  try {
    engine.load(settings.selected, 0);
    afterLoad(settings.selected);
  } catch (error) {
    session.recordFailure(settings.selected, error);
    dispatch({ type: "failed" });
  }
  startTriggers(context, source);
  if (!settings.noticeSeen) {
    hud.toast("Press ? for hotkeys · right-click for settings");
    settings.noticeSeen = true;
  }
}

export function stop() {
  disposers.forEach((dispose) => dispose());
  disposers = [];
  engine.stop();
  hud.unmount();
}

export function toggle() {
  if (engine.isRunning()) stop();
  else start();
}

/** Manual pick from the settings panel. */
export function select(name: string) {
  if (engine.isRunning()) dispatch({ type: "select", name });
  else settings.selected = name;
}

export function applyRenderScale() {
  engine.resize();
}

engine.canvas.addEventListener("dblclick", openConfig);
engine.canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  openConfig();
});
