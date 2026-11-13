<script setup lang="ts">
import { presetNames } from "../runtime/engine";
import { settings, toggleInList } from "../runtime/settingsStore";
import * as controller from "../runtime/controller";

defineProps<{ closeFn: () => void }>();

const searchAll = ref("");
const searchFav = ref("");

function matching(names: readonly string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  return needle ? names.filter((name) => name.toLowerCase().includes(needle)) : [...names];
}

const presetsFiltered = computed(() => matching(presetNames, searchAll.value));
const favoritesFiltered = computed(() => matching(settings.favorites, searchFav.value));
const isFavorite = computed(() => settings.favorites.includes(settings.selected));
const isBlocked = computed(() => settings.blocklist.includes(settings.selected));

const selected = computed({
  get: () => settings.selected,
  set: (name: string) => controller.select(name),
});

watch(() => settings.renderScale, () => controller.applyRenderScale());

function unblock(name: string) {
  toggleInList(settings.blocklist, name);
}
</script>

<template>
  <div class="plugin-base q-mt-sm viz-settings">
    <div class="row flex-gap-2">
      <div class="col">
        <div class="shelf-title">Available ({{ presetNames.length }})</div>
        <input v-model="searchAll" type="text" class="full-width" placeholder="Search all..." />
        <select v-model="selected" class="options-list" size="3">
          <option v-for="name in presetsFiltered" :key="name" :value="name" :class="{ blocked: settings.blocklist.includes(name) }">
            {{ name }}
          </option>
        </select>
        <button class="full-width q-my-sm" @click="toggleInList(settings.favorites, settings.selected)">
          {{ isFavorite ? "❌ Remove From Favorites" : "⭐ Add To Favorites" }}
        </button>
      </div>
      <div class="col">
        <div class="shelf-title">Favorites ({{ settings.favorites.length }})</div>
        <input v-model="searchFav" type="text" class="full-width" placeholder="Search favorites..." />
        <select v-model="selected" class="options-list" size="3">
          <option v-for="name in favoritesFiltered" :key="name" :value="name">{{ name }}</option>
        </select>
        <button class="full-width q-my-sm" @click="toggleInList(settings.blocklist, settings.selected)">
          {{ isBlocked ? "✅ Unblock" : "🚫 Block This Preset" }}
        </button>
      </div>
    </div>

    <div class="shelf-title">Auto-cycle</div>
    <div class="cycle-grid">
      <label><input v-model="settings.autoCycle" type="checkbox" /> Every</label>
      <span><input v-model.number="settings.intervalSec" type="number" min="5" max="300" step="5" class="narrow" /> seconds</span>
      <label><input v-model="settings.onSongChange" type="checkbox" /> On song change</label>
      <span></span>
      <label><input v-model="settings.onBeat" type="checkbox" /> On big drop</label>
      <select v-model="settings.beatSensitivity" :disabled="!settings.onBeat">
        <option value="low">Low sensitivity</option>
        <option value="medium">Medium sensitivity</option>
        <option value="high">High sensitivity</option>
      </select>
      <label><input v-model="settings.favoritesOnly" type="checkbox" /> Favourites only</label>
      <span></span>
    </div>

    <details class="q-mt-sm">
      <summary class="shelf-title">Blocklist ({{ settings.blocklist.length }})</summary>
      <div v-if="settings.blocklist.length === 0" class="muted">Nothing blocked. Press B while a preset is showing.</div>
      <div v-for="name in settings.blocklist" :key="name" class="block-row">
        <span>{{ name }}</span>
        <button @click="unblock(name)">Unblock</button>
      </div>
    </details>

    <div class="shelf-title">Render Scale</div>
    <input v-model.number="settings.renderScale" type="number" class="full-width" min="0.25" max="2" step="0.25" />
    <div class="muted">1 = window resolution. 2 = Retina-native (heavier on the GPU).</div>

    <div class="muted q-mt-sm">Press <kbd>?</kbd> while the visualizer is showing for hotkeys.</div>

    <div class="row flex-gap-2 q-mt-sm">
      <button class="full-width c-btn" @click="controller.stop(); closeFn()">Close Visualizer</button>
      <button class="full-width c-btn" @click="closeFn">Done</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.viz-settings {
  max-width: 560px;
}
.options-list {
  min-width: 0;
  width: 100%;
  height: 260px;
  display: inline-flex;
  overflow: hidden;
  overflow-y: scroll;
  font-size: inherit;
  option {
    padding: 3px;
    font-size: inherit;
    &.blocked {
      opacity: 0.4;
      text-decoration: line-through;
    }
  }
}
.cycle-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  align-items: center;
}
.narrow {
  width: 70px;
}
.block-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
}
.muted {
  opacity: 0.7;
  font-size: 0.9em;
}
</style>
