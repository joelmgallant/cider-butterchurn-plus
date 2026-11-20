# Butterchurn+ (personal fork)

Fork of [booploops/Cider-Butterchurn](https://github.com/booploops/Cider-Butterchurn) with:

- **Auto-cycling presets**: on a timer (5–300 s), on song change, and on big bass drops, arbitrated so they never double-switch.
- **Hotkeys** while the visualizer is showing: `N` next (random), `P` previous, `L` lock, `F` favourite, `B` blocklist + skip, `H` toggle preset name, `?` cheat sheet.
- **Toolbar toggle**: a ✺ button in Cider's top bar toggles the visualizer (right-click for settings) and glows while it runs; a floating "✕ Visualizer off" button appears on mouse movement over the visualizer.
- **Blocklist and favourites-only pool**, editable in the settings panel (right-click or double-click the visualizer).
- Fixes: no AudioContext leak per toggle, no `alert()`, Retina no longer simulates 4× the pixels it shows, listeners torn down on stop.

Identifier `com.joelmgallant.butterchurn`. Settings migrate from the original plugin's `bc-*` keys on first run.

```sh
yarn install
yarn test            # Vitest unit tests for src/core
yarn install-local   # build and copy into Cider 4's plugins dir, then restart Cider
```

Design: `docs/superpowers/specs/2026-11-12-butterchurn-fork-design.md`.

## Manual verification checklist (Cider) — passed 2026-11-13

- [x] Main menu "Open Visualizer (Butterchurn+)" starts it; first run shows the `?` hint toast
- [x] Timer cycles at the configured interval; a manual switch resets the timer
- [x] Skipping a track changes preset
- [x] A big drop changes preset (at most once per 20 s)
- [x] `N` `P` `L` `F` `B` `H` `?` `Esc` all behave; typing in the settings search box does not trigger them
- [x] Lock blocks timer, song and drop changes; `N` still works while locked
- [x] Immersive layout "Butterchurn+ Visualizer" works and closing immersive stops the visualizer
- [x] Open/close 10 times: no speed-up, no duplicate switches
- [x] Render scale 1 vs 2 visibly changes sharpness

---

<div align="center">
 <img src="./repo_assets/header-preivew.png" style="width: 600px;"/> 
 </div>

# Butterchurn Visualizer Plugin for [Cider](https://cider.sh/)

⚠️ **Requires Cider 2.5.0 or later**

⚠️ **Requires Cider Audio Enabled**

## Available Commands
- `npm run dev` - Start development server, Cider can then listen to this server when you select "Enable Vite" from the main menu
- `npm run build` - Build the plugin to `dist/dev.booploops.butterchurn-visualizer/`

## How to install after build
- Copy the `dist/dev.booploops.butterchurn-visualizer/` folder to the `/plugins` directory of your Cider app data directory
    - On Windows, this is `%APPDATA%\C2Windows\plugins`
    - On macOS, this is `~/Library/Application Support/sh.cider.electron/plugins`
    - On Linux, this is `~/.config/sh.cider.electron/plugins`

## More Information

For more information on how to build your own plugin check out: https://github.com/ciderapp/plugin-template-wip

## Technical Information

This plugin has been ported from Apple Music Electron to Cider 1.x to Cider 2.x.  

The code around this is of *questionable* quality.  Mainly ported as proof of concept but will be improved over time as the Cider Plugin API and this plugin matures.  As most of the code is a straight import from a JS only project a lot of TS rules have been disabled.


## Credits

Butterchurn: https://github.com/jberg/butterchurn

Butterchurn Presets: https://github.com/jberg/butterchurn-presets
