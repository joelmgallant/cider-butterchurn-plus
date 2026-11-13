import { defineCustomElement } from "vue";
import { addImmersiveMenuEntry, addMainMenuEntry } from "@ciderapp/pluginkit";
import { definePluginContext } from "@ciderapp/pluginkit";
import * as controller from "./runtime/controller";
import { openConfig } from "./runtime/configModal";
import "./imported/style.scss";
import PluginSettings from "./components/PluginSettings.vue";
import VizSettings from "./components/VizSettings.vue";
import { subscribeEvent } from "@ciderapp/pluginkit";
import { addImmersiveLayout } from "@ciderapp/pluginkit"
import CustomImmersiveLayout from "./components/CustomImmersiveLayout.vue";
import pluginConfig from "./plugin.config.ts";

/**
 * Custom Elements that will be registered in the app
 */
export const CustomElements
    = {
    'plugin-settings':
        defineCustomElement(PluginSettings, {
            shadowRoot: false,
        }),
    'viz-settings':
        defineCustomElement(VizSettings, {
            shadowRoot: false,
        }),
    'immersive-layout': defineCustomElement(CustomImmersiveLayout, {
        shadowRoot: false,
    })
}

const { plugin, setupConfig, customElementName, goToPage, useCPlugin } = definePluginContext({
    ...pluginConfig,
    CustomElements,
    /**
     * Initial setup function that is executed when the plugin is loaded
     */
    setup() {

        for (const [key, value] of Object.entries(CustomElements)) {
            const _key = key as keyof typeof CustomElements;
            customElements.define(customElementName(_key), value)
        }

        this.SettingsElement = customElementName('plugin-settings');

        subscribeEvent('immersive:closed', () => {
            if (controller.isRunning()) {
                controller.stop();
            }
        })

        addImmersiveLayout({
            name: "Butterchurn+ Visualizer",
            identifier: "bcplus-visualizer-centered",
            component: customElementName('immersive-layout'),
            type: 'normal',
        })

        addMainMenuEntry({
            label: "Open Visualizer (Butterchurn+)",
            onClick() {
                controller.toggle();
            },
        })

        addImmersiveMenuEntry({
            label: "Toggle Visualizer",
            onClick() {
                controller.toggle();

                if (!controller.isRunning()) {
                    document.querySelector('.player-modal')?.classList.remove('force-transparent')
                    document.querySelector('.blurmap')?.classList.remove('hidden')
                } else {
                    document.querySelector('.player-modal')?.classList.add('force-transparent')
                    document.querySelector('.blurmap')?.classList.add('hidden')
                }

            },
        })
        addImmersiveMenuEntry({
            label: "Configure Visualizer",
            onClick() {
                openConfig();
            },
        })

    },
})

/**
 * Exporting the plugin and functions
 */
export { setupConfig, customElementName, goToPage, useCPlugin };

/**
 * Exporting the plugin, Cider will use this to load the plugin
 */
export default plugin;