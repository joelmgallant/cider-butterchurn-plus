/** WebGL calls that build a program; everything else is stubbed while recording. */
const RECORDED_METHODS = new Set([
  "createShader",
  "shaderSource",
  "compileShader",
  "createProgram",
  "attachShader",
  "bindAttribLocation",
  "linkProgram",
]);

export interface GlCall {
  method: string;
  args: unknown[];
  /** Placeholder handed back for create* calls, mapped to the real object on replay. */
  placeholder?: object;
}

type GlLike = Record<string, any>;

/**
 * A stand-in WebGL context that records program-building calls and does no GPU work.
 * Lets us capture the exact shader sources a library generates without compiling them.
 */
export function createRecordingGl(real: GlLike): { gl: GlLike; log: GlCall[] } {
  const log: GlCall[] = [];
  const gl = new Proxy({} as GlLike, {
    get(_target, prop) {
      const value = real[prop as string];
      if (typeof value !== "function") return value;
      const method = String(prop);
      return (...args: unknown[]) => {
        if (RECORDED_METHODS.has(method)) {
          const placeholder = method.startsWith("create") ? { placeholder: method } : undefined;
          log.push({ method, args, placeholder });
          return placeholder;
        }
        return method.startsWith("get") || method.startsWith("create") ? {} : undefined;
      };
    },
  });
  return { gl, log };
}

/** Issue recorded calls on a real context (no status queries, so nothing blocks). */
export function replayGlCalls(real: GlLike, log: readonly GlCall[]): { programs: unknown[]; shaders: unknown[] } {
  const created = new Map<object, unknown>();
  const programs: unknown[] = [];
  const shaders: unknown[] = [];
  for (const { method, args, placeholder } of log) {
    const realArgs = args.map((arg) => (typeof arg === "object" && arg !== null && created.has(arg) ? created.get(arg) : arg));
    const result = real[method](...realArgs);
    if (placeholder) {
      created.set(placeholder, result);
      (method === "createProgram" ? programs : shaders).push(result);
    }
  }
  return { programs, shaders };
}
