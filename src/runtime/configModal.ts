import { createModal } from "@ciderapp/pluginkit";
import pluginConfig from "../plugin.config";

/** Opens the settings panel custom element in a Cider modal. */
export function openConfig() {
  const { closeDialog, openDialog, dialogElement } = createModal({ escClose: true });
  const content = document.createElement(`${pluginConfig.ce_prefix}-viz-settings`) as HTMLElement & {
    closeFn?: () => void;
  };
  content.closeFn = closeDialog;
  dialogElement.appendChild(content);
  openDialog();
}
