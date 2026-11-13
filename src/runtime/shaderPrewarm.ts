import { createRecordingGl, replayGlCalls, type GlCall } from "../core/glRecorder";

const POLL_MS = 50;
const GIVE_UP_MS = 10_000;

type ShaderLike = { gl: unknown; createShader(text: string): void };
type RendererLike = { gl: WebGL2RenderingContext; warpShader: ShaderLike; compShader: ShaderLike };
type PresetLike = { warp?: string; comp?: string };

/** Run butterchurn's own createShader against a recording context to capture its GL calls. */
function recordShaderBuild(shader: ShaderLike, gl: WebGL2RenderingContext, text: string): GlCall[] {
  const { gl: recording, log } = createRecordingGl(gl as unknown as Record<string, any>);
  // Call the prototype method on a shallow copy so the live shader is untouched.
  const proto = Object.getPrototypeOf(shader) as ShaderLike;
  const copy = Object.assign(Object.create(proto), shader, { gl: recording }) as ShaderLike;
  proto.createShader.call(copy, text);
  return log;
}

/**
 * Compile the preset's warp + comp programs in the background (KHR_parallel_shader_compile)
 * so the later loadPreset hits Chromium's program cache instead of blocking ~100-300 ms.
 * Returns a cancel function. Without the extension it does nothing rather than block.
 */
export function prewarmShaders(renderer: RendererLike, preset: PresetLike): () => void {
  const gl = renderer.gl;
  const ext = gl.getExtension("KHR_parallel_shader_compile");
  if (!ext) return () => {};

  const builds = [
    replayGlCalls(gl, recordShaderBuild(renderer.warpShader, gl, (preset.warp ?? "").trim())),
    replayGlCalls(gl, recordShaderBuild(renderer.compShader, gl, (preset.comp ?? "").trim())),
  ];
  const programs = builds.flatMap((build) => build.programs) as WebGLProgram[];
  const startedAt = performance.now();
  let timer = 0;
  let finished = false;

  function release() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    for (const build of builds) {
      build.programs.forEach((program) => gl.deleteProgram(program as WebGLProgram));
      build.shaders.forEach((shader) => gl.deleteShader(shader as WebGLShader));
    }
  }

  function poll() {
    const done = programs.every((program) => gl.getProgramParameter(program, ext!.COMPLETION_STATUS_KHR));
    if (done || performance.now() - startedAt > GIVE_UP_MS) release();
    else timer = window.setTimeout(poll, POLL_MS);
  }
  timer = window.setTimeout(poll, POLL_MS);
  return release;
}
