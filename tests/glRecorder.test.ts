import { describe, expect, it } from "vitest";
import { createRecordingGl, replayGlCalls } from "../src/core/glRecorder";

const CONSTANTS = { VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, LINK_STATUS: 35714 };

function fakeRealGl() {
  const calls: string[] = [];
  let next = 0;
  const gl = {
    ...CONSTANTS,
    createShader: (type: number) => ({ kind: "shader", type, id: ++next }),
    createProgram: () => ({ kind: "program", id: ++next }),
    shaderSource: (shader: { id: number }, src: string) => calls.push(`source#${shader.id}:${src}`),
    compileShader: (shader: { id: number }) => calls.push(`compile#${shader.id}`),
    attachShader: (program: { id: number }, shader: { id: number }) => calls.push(`attach#${program.id}<-${shader.id}`),
    bindAttribLocation: (program: { id: number }, index: number, name: string) => calls.push(`bind#${program.id}:${index}:${name}`),
    linkProgram: (program: { id: number }) => calls.push(`link#${program.id}`),
    useProgram: () => calls.push("useProgram"),
    getUniformLocation: () => {
      throw new Error("must not reach the real context while recording");
    },
  };
  return { gl, calls };
}

/** The same sequence butterchurn's createShader performs. */
function butterchurnLikeCreateShader(gl: any) {
  const program = gl.createProgram();
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertex, "VS");
  gl.compileShader(vertex);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragment, "FS");
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  gl.useProgram(program);
  return gl.getUniformLocation(program, "u");
}

describe("glRecorder", () => {
  it("records compile/link calls without touching the real context", () => {
    const { gl, calls } = fakeRealGl();
    const { gl: recording, log } = createRecordingGl(gl);
    butterchurnLikeCreateShader(recording);
    expect(calls).toEqual([]);
    expect(log.map((entry) => entry.method)).toEqual([
      "createProgram",
      "createShader",
      "shaderSource",
      "compileShader",
      "createShader",
      "shaderSource",
      "compileShader",
      "attachShader",
      "attachShader",
      "bindAttribLocation",
      "linkProgram",
    ]);
  });

  it("passes numeric constants through", () => {
    const { gl } = fakeRealGl();
    expect(createRecordingGl(gl).gl.VERTEX_SHADER).toBe(35633);
  });

  it("replays onto the real context, mapping placeholders to real objects", () => {
    const { gl, calls } = fakeRealGl();
    const { gl: recording, log } = createRecordingGl(gl);
    butterchurnLikeCreateShader(recording);
    const { programs, shaders } = replayGlCalls(gl, log);
    expect(programs).toHaveLength(1);
    expect(shaders).toHaveLength(2);
    expect(calls).toEqual([
      "source#2:VS",
      "compile#2",
      "source#3:FS",
      "compile#3",
      "attach#1<-2",
      "attach#1<-3",
      "bind#1:0:aPos",
      "link#1",
    ]);
  });
});
