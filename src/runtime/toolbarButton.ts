import { addCustomButton } from "@ciderapp/pluginkit";

/**
 * Cider renders CustomButtonOptions.element as a text node (toDisplayString), not innerHTML as
 * PluginKit's docs claim, so the icon must be a plain glyph. The title doubles as a stable CSS hook.
 */
const TITLE = "Toggle visualizer (Butterchurn+) · right-click for settings";
const GLYPH = "✺";
const RUNNING_CLASS = "bcplus-running";

const STYLE = `
[title="${TITLE}"]{font-size:17px;line-height:1;transition:color .2s,text-shadow .2s}
html.${RUNNING_CLASS} [title="${TITLE}"]{color:var(--keyColor,#fa586a);text-shadow:0 0 8px var(--keyColor,#fa586a)}
`;

export function setRunningIndicator(running: boolean) {
  document.documentElement.classList.toggle(RUNNING_CLASS, running);
}

export function registerToolbarButton(onToggle: () => void, onConfigure: () => void) {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);
  try {
    addCustomButton({
      location: "chrome-top/right",
      element: GLYPH,
      title: TITLE,
      onClick: () => onToggle(),
      onContextMenu: (event) => {
        event.preventDefault();
        onConfigure();
      },
    });
  } catch (error) {
    console.warn("[Butterchurn+] toolbar button unavailable in this Cider build", error);
  }
}
