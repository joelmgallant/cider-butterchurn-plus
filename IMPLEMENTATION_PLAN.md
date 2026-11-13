# Butterchurn+ Implementation Plan

Spec: `docs/superpowers/specs/2026-11-12-butterchurn-fork-design.md`

Global constraints: yarn 4 + Vite 7 + Vue 3.5 (existing); Vitest added for tests; identifier
`com.joelmgallant.butterchurn`; every `src/core/` module is pure and < 200 LOC; no `alert()`.

## Stage 1: Tooling + identity
**Goal:** Vitest runs; plugin builds under the new identifier.
**Success Criteria:** `yarn test` runs (0 tests OK); `yarn build` emits `plugin.yml` with new identifier, version 2.0.0, stable ce_prefix.
**Tests:** a smoke test for `trackKey`.
**Status:** Complete

## Stage 2: Pure core — settings, presetPool, trackKey, hotkeys
**Goal:** Typed settings with migration; pool filtering + random pick; key → action map.
**Success Criteria:** all unit tests green.
**Tests:** defaults, per-field corruption, legacy `bc-*` migration; blocklist/favourites/fallback; no-repeat window incl. tiny pools; hotkey mapping ignores inputs + modifiers.
**Status:** Not Started

## Stage 3: Pure core — cycler
**Goal:** `decide()` implements every row of the spec's intent table.
**Success Criteria:** tests for lock, dwell, debounce, timer reset, history prev/truncate, block, empty pool.
**Status:** Not Started

## Stage 4: Pure core — bassEnergy + beatDetector
**Goal:** Drop detection from synthetic energy series.
**Success Criteria:** steady loud signal → no drop; quiet→loud jump → one drop; refractory respected; silence → none; sensitivity ordering holds.
**Status:** Not Started

## Stage 5: Runtime — engine, triggers, HUD, controller, Vue wiring
**Goal:** Replace `port.ts`/`_amOT` with runtime modules; settings panel gains cycling/blocklist UI; `?` cheat sheet.
**Success Criteria:** `vue-tsc --noEmit` clean for new code, `yarn build` succeeds, no references to `_amOT` remain, bundle installs into Cider.
**Tests:** unit tests stay green; manual Cider checklist (Stage 6).
**Status:** Not Started

## Stage 6: Install + manual verification
**Goal:** Installed in Cider, original disabled.
**Success Criteria:** checklist in README filled with observed results (Joel drives Cider).
**Status:** Not Started
