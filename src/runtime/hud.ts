import { HOTKEY_HELP } from "../core/hotkeys";

const ROOT_STYLE = `
.bcplus-hud{position:fixed;inset:0;pointer-events:none;z-index:10001;font:500 14px -apple-system,system-ui,sans-serif;color:#fff}
.bcplus-toast,.bcplus-name{position:absolute;left:24px;padding:8px 14px;border-radius:10px;background:rgba(0,0,0,.55);backdrop-filter:blur(12px);transition:opacity .4s;opacity:0;max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bcplus-name{top:24px}.bcplus-toast{top:68px}
.bcplus-show{opacity:1}
.bcplus-help{position:absolute;inset:0;display:none;place-items:center;background:rgba(0,0,0,.45);pointer-events:auto}
.bcplus-help.bcplus-open{display:grid}
.bcplus-help-card{background:rgba(20,20,24,.92);border-radius:14px;padding:20px 26px;min-width:340px}
.bcplus-help-card h3{margin:0 0 12px;font-size:16px}
.bcplus-help-card table{border-collapse:collapse;width:100%}
.bcplus-help-card td{padding:4px 8px}
.bcplus-help-card kbd{display:inline-block;min-width:22px;text-align:center;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.15);font:600 13px ui-monospace,monospace}
.bcplus-help-state{margin-top:12px;opacity:.75;font-size:13px}
.bcplus-exit{position:absolute;top:20px;right:24px;pointer-events:auto;cursor:pointer;border:0;padding:8px 14px;border-radius:10px;background:rgba(0,0,0,.55);backdrop-filter:blur(12px);color:#fff;font:inherit;opacity:0;transition:opacity .4s}
.bcplus-exit.bcplus-show{opacity:1}
.bcplus-exit:hover{background:rgba(0,0,0,.8)}
`;

const NAME_MS = 4_000;
const TOAST_MS = 2_500;
const EXIT_IDLE_MS = 2_500;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function flash(node: HTMLElement, text: string, ms: number, timers: Map<HTMLElement, number>) {
  node.textContent = text;
  node.classList.add("bcplus-show");
  clearTimeout(timers.get(node));
  timers.set(node, window.setTimeout(() => node.classList.remove("bcplus-show"), ms));
}

function buildHelpCard(onClose: () => void) {
  const help = el("div", "bcplus-help");
  const card = el("div", "bcplus-help-card");
  card.appendChild(el("h3", "", "Butterchurn+ hotkeys"));
  const table = el("table", "");
  for (const entry of HOTKEY_HELP) {
    const row = table.insertRow();
    row.insertCell().appendChild(el("kbd", "", entry.keys));
    row.insertCell().textContent = entry.label;
  }
  card.appendChild(table);
  const state = el("div", "bcplus-help-state");
  card.appendChild(state);
  help.appendChild(card);
  help.addEventListener("click", (event) => {
    if (event.target === help) onClose();
  });
  return { help, state };
}

/**
 * Overlay for preset names, toasts, the hotkey cheat sheet and a floating off button that shows on
 * mouse movement (the full-window canvas covers Cider's own controls). No Cider toast API exists.
 */
export function createHud(onExit: () => void) {
  const timers = new Map<HTMLElement, number>();
  const style = el("style", "", ROOT_STYLE);
  const root = el("div", "bcplus-hud");
  const name = el("div", "bcplus-name");
  const toast = el("div", "bcplus-toast");
  const { help, state } = buildHelpCard(() => setHelp(false));
  const exit = el("button", "bcplus-exit", "✕ Visualizer off");
  exit.addEventListener("click", onExit);
  root.append(name, toast, exit, help);

  function revealExit() {
    flash(exit, exit.textContent ?? "", EXIT_IDLE_MS, timers);
  }

  function mount() {
    if (root.isConnected) return;
    document.body.append(style, root);
    window.addEventListener("mousemove", revealExit);
  }

  function setHelp(open: boolean, stateLine = "") {
    mount();
    state.textContent = stateLine;
    help.classList.toggle("bcplus-open", open);
  }

  return {
    toast(text: string) {
      mount();
      flash(toast, text, TOAST_MS, timers);
    },
    presetName(text: string) {
      mount();
      flash(name, text, NAME_MS, timers);
    },
    hidePresetName() {
      name.classList.remove("bcplus-show");
    },
    isHelpOpen: () => help.classList.contains("bcplus-open"),
    setHelp,
    mount,
    unmount() {
      window.removeEventListener("mousemove", revealExit);
      exit.classList.remove("bcplus-show");
      help.classList.remove("bcplus-open");
      timers.forEach((timer) => clearTimeout(timer));
      root.remove();
      style.remove();
    },
  };
}

export type Hud = ReturnType<typeof createHud>;
