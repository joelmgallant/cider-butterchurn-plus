# Butterchurn+ — fork design

Date: 2026-11-12
Upstream: https://github.com/booploops/Cider-Butterchurn (MIT), forked at `dfd8d47` (1.0.3)

## Goal

A personal fork of the Cider Butterchurn visualizer that cycles presets automatically,
replaces the legacy `_amOT` global with small tested modules, and fixes upstream bugs.

## Identity

- Identifier `com.joelmgallant.butterchurn`, name "Butterchurn+", version 2.0.0.
- Installs beside (in practice: instead of) `dev.booploops.butterchurn-visualizer`.
- MIT licence and upstream credit kept.

## Architecture

| Module | Responsibility | Pure |
|---|---|---|
| `src/core/cycler.ts` | `decide(state, intent, now, pool, rng)` → next state + optional load | yes |
| `src/core/presetPool.ts` | eligible list (blocklist, favourites-only, fallback), random pick avoiding recent | yes |
| `src/core/beatDetector.ts` | bass energy frames → drop events (short vs long EMA ratio, refractory) | yes |
| `src/core/bassEnergy.ts` | analyser frequency bytes → 0..1 bass energy | yes |
| `src/core/settings.ts` | defaults, field-level parse/validate, legacy `bc-*` migration | yes |
| `src/core/hotkeys.ts` | `KeyboardEvent`-like → action, ignoring inputs/modifiers | yes |
| `src/core/trackKey.ts` | now-playing item → stable track key | yes |
| `src/runtime/engine.ts` | canvas + butterchurn lifecycle, resize, `load(name, blend)` | no |
| `src/runtime/controller.ts` | wires triggers → cycler → engine, HUD, persistence | no |
| `src/runtime/triggers.ts` | timer tick, song poll, analyser loop, keydown listener | no |
| `src/runtime/hud.ts` | toasts, preset-name HUD, `?` cheat sheet | no |
| `src/components/*.vue` | settings panel (cycling section, favourites, blocklist), immersive layout | UI |

## Cycling rules

| Source | Intent | Lock | Dwell | Blend |
|---|---|---|---|---|
| Timer | `auto:timer` | blocks | is the clock | 2.7 s |
| Song change | `auto:song` | blocks | debounce 3 s | 2.0 s |
| Beat / drop | `auto:beat` | blocks | min 20 s since last switch | 0.5 s |
| `N` | `random` | ignored | none | 1.0 s |
| `P` | `prev` | ignored | none | 1.0 s |

- Any switch resets the timer.
- `L` toggles lock; lock blocks automatic intents only and survives manual navigation.
- Random picks avoid the last 20 shown (capped at pool size − 1).
- History stack capped at 50; picking after stepping back truncates forward entries.
- `F` toggles favourite, `B` blocklists current and advances, `H` toggles HUD, `?` toggles cheat sheet, `Esc` closes it.
- Hotkeys only act while the visualizer is running and focus is not in an editable element; no modifiers.
- Arrow keys are not bound (avoids colliding with Cider seek bindings).

Defaults: auto-cycle on, 30 s (5–300), song change on, beat on at medium sensitivity, favourites-only off.

## Findings folded in

- **AudioContext leak**: upstream creates a new `AudioContext` on every toggle; the engine uses only `CiderAudio.context`.
- **Retina over-render**: butterchurn sizes simulation textures `width × pixelRatio` but draws output at `width × height`
  (`lib/butterchurn.js:2451`, `:2865`). Upstream passed `devicePixelRatio`, so Retina simulated 4× the pixels it displayed.
  Engine passes `pixelRatio: 1`; render scale (0.25–2) controls quality.
- `fps` option is ignored by butterchurn; removed.
- MusicKit is deprecated in Cider 4 and pluginkit has no track-change event: song change polls
  `AppleMusic.nowPlayingItem` once per second.
- No toast API in pluginkit: HUD renders its own toasts. No `alert()`.
- Resize via `addEventListener`, removed on stop. All listeners/timers torn down on stop.

## Error handling

- Audio not ready: toast, subscribe to CiderAudio `ready`, start then.
- Preset load throws: log, auto-advance; two failures skip it for the session.
- Settings parse: per-field fallback to defaults.
- Empty pool: fall back to all-minus-blocklist, then to all; toast once.

## Testing

- Vitest, TDD, for every module in `src/core/`.
- Manual Cider checklist: install, each trigger, each hotkey, immersive layout, 10 open/close cycles.

## Out of scope

BPM/mood selection, album-art palettes, new presets, marketplace publishing, upstream PRs.
