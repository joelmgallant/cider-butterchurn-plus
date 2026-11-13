import { bassEnergy } from "../core/bassEnergy";
import { createDetector, stepDetector } from "../core/beatDetector";
import { hotkeyAction, type HotkeyAction } from "../core/hotkeys";
import type { Sensitivity } from "../core/settings";

export type Dispose = () => void;

export function startTicker(onTick: () => void, intervalMs = 1_000): Dispose {
  const timer = window.setInterval(onTick, intervalMs);
  return () => clearInterval(timer);
}

/** Polls a track identity and reports changes; the first observation is only a baseline. */
export function startSongWatcher(readKey: () => string | null, onChange: () => void, intervalMs = 1_000): Dispose {
  let previous = readKey();
  return startTicker(() => {
    const key = readKey();
    if (key !== null && key !== previous) {
      previous = key;
      onChange();
    } else if (key === null) {
      previous = null;
    }
  }, intervalMs);
}

/** Taps the audio source with an AnalyserNode and runs the drop detector each frame. */
export function startBeatWatcher(
  context: AudioContext,
  source: AudioNode,
  options: { enabled: () => boolean; sensitivity: () => Sensitivity },
  onDrop: () => void,
): Dispose {
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  const bytes = new Uint8Array(analyser.frequencyBinCount);
  let detector = createDetector();
  let last = performance.now();
  let frame = 0;

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const dt = now - last;
    last = now;
    if (!options.enabled()) {
      detector = createDetector();
      return;
    }
    analyser.getByteFrequencyData(bytes);
    const energy = bassEnergy(bytes, context.sampleRate, analyser.fftSize);
    const result = stepDetector(detector, energy, dt, now, options.sensitivity());
    detector = result.state;
    if (result.drop) onDrop();
  }
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    try {
      source.disconnect(analyser);
    } catch {
      // already disconnected
    }
  };
}

/** Window-level key listener; returns true from onAction to consume the event. */
export function startHotkeys(onAction: (action: HotkeyAction) => boolean): Dispose {
  function onKeyDown(event: KeyboardEvent) {
    const action = hotkeyAction(event);
    if (action && onAction(action)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
