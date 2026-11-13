import { reactive, watch } from "vue";
import { SETTINGS_KEY, loadSettings, type Settings } from "../core/settings";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Reactive, persisted plugin settings shared by the controller and the Vue panel. */
export const settings: Settings = reactive(loadSettings(readStorage));

watch(
  settings,
  (value) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn("[Butterchurn+] could not persist settings", error);
    }
  },
  { deep: true },
);

export function toggleInList(list: string[], name: string): boolean {
  const index = list.indexOf(name);
  if (index === -1) {
    list.push(name);
    return true;
  }
  list.splice(index, 1);
  return false;
}
