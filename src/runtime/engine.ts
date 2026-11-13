import butterchurn from "butterchurn";
import "../imported/plugin-visualizer-butterchurnExtraImages";
import { importedPresets } from "../imported/full-presets";

type Visualizer = {
  connectAudio(node: AudioNode): void;
  loadPreset(preset: unknown, blendSeconds: number): void;
  loadExtraImages(images: unknown): void;
  setRendererSize(width: number, height: number): void;
  render(): void;
};

const presets: Record<string, unknown> = importedPresets.getPresets();
export const presetNames: readonly string[] = Object.keys(presets);

/**
 * Owns the canvas and the butterchurn instance. Uses Cider's AudioContext only.
 * pixelRatio is fixed at 1: butterchurn draws its output at width x height regardless,
 * so a higher pixelRatio only inflates the simulation textures (see design spec).
 */
export function createEngine(getRenderScale: () => number) {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", left: "0", bottom: "0", width: "100%", height: "100%", display: "none" });
  let visualizer: Visualizer | null = null;
  let frame = 0;
  let running = false;

  function size() {
    const scale = getRenderScale();
    return { width: Math.round(window.innerWidth * scale), height: Math.round(window.innerHeight * scale) };
  }

  function resize() {
    if (!visualizer) return;
    const { width, height } = size();
    canvas.width = width;
    canvas.height = height;
    visualizer.setRendererSize(width, height);
  }

  function ensureVisualizer(context: AudioContext, source: AudioNode) {
    if (visualizer) return;
    document.body.appendChild(canvas);
    const { width, height } = size();
    visualizer = butterchurn.createVisualizer(context, canvas, {
      width,
      height,
      // Upstream passed mesh_width/mesh_height, which butterchurn ignores, so it has always
      // run the default 48x36 mesh. Keep that look and cost.
      pixelRatio: 1,
      textureRatio: 1,
    }) as Visualizer;
    // UMD bundle registers itself as a global.
    const extraImages = (globalThis as any).butterchurnExtraImages;
    if (extraImages) visualizer.loadExtraImages(extraImages.default?.getImages?.() ?? extraImages.getImages());
    visualizer.connectAudio(source);
  }

  function renderLoop() {
    if (!running || !visualizer) return;
    visualizer.render();
    frame = requestAnimationFrame(renderLoop);
  }

  return {
    canvas,
    isRunning: () => running,
    start(context: AudioContext, source: AudioNode, behindImmersive: boolean) {
      ensureVisualizer(context, source);
      canvas.style.zIndex = behindImmersive ? "-1" : "9998";
      canvas.style.display = "";
      window.addEventListener("resize", resize);
      resize();
      running = true;
      cancelAnimationFrame(frame);
      renderLoop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.style.display = "none";
    },
    resize,
    /** Throws if the preset is unknown or butterchurn fails to compile it. */
    load(name: string, blendSeconds: number) {
      const preset = presets[name];
      if (!preset) throw new Error(`Unknown preset: ${name}`);
      visualizer?.loadPreset(preset, blendSeconds);
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
