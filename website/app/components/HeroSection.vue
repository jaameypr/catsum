<script setup lang="ts">
import { ref } from 'vue'
import type { CatsumConfig, CatsumConfigOverrides } from 'catsum'

const inputValue = ref('alice')
const activeSeed = ref('alice')
const overrides  = ref<CatsumConfigOverrides>({})
const catConfig  = ref<CatsumConfig | null>(null)
const focused    = ref(false)

const QUICK_PICKS = ['@satoshi', '0x71C7…976F', 'Orion-7', 'Mochi', 'DOC-99812']

function onInput()  { activeSeed.value = inputValue.value.trim() || 'catsum' }
function pick(val: string) { inputValue.value = val; activeSeed.value = val }
</script>

<template>
  <header id="play" class="hero">
    <div class="wrap">
      <div class="hero-grid">

        <!-- Left: copy + seed field + trait controls -->
        <div class="hero-copy">
          <span class="eyebrow">Deterministic procedural cats</span>

          <h1 class="h1">
            Every string is<br>
            a <em>cat</em>.
          </h1>

          <p class="lede">
            Type a name, handle, wallet, or ID — catsum draws a unique SVG cat as its
            <strong>permanent face</strong>. The same input always produces the exact same cat.
            No images, no textures: every whisker is geometry.
          </p>

          <div class="field" :class="{ focused }">
            <span class="paw">🐾</span>
            <input
              v-model="inputValue"
              type="text"
              placeholder="Type a name, handle, wallet, or ID…"
              autocomplete="off"
              spellcheck="false"
              @input="onInput"
              @focus="focused = true"
              @blur="focused = false"
            />
          </div>

          <div class="examples">
            <span class="ex-lbl">Try</span>
            <button v-for="val in QUICK_PICKS" :key="val" class="chip" @click="pick(val)">{{ val }}</button>
          </div>

          <TraitControls :config="catConfig" @update="(o) => (overrides = o)" />
        </div>

        <!-- Right: cat stage + specimen card -->
        <div class="hero-right">
          <div class="stage">
            <ClientOnly>
              <CatViewer
                :seed="activeSeed"
                :overrides="overrides"
                @config="(c) => (catConfig = c)"
              />
            </ClientOnly>
          </div>
          <SpecimenCard :config="catConfig" />
        </div>

      </div>
    </div>
  </header>
</template>

<style scoped>
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 104px 0 64px;
  position: relative;
  z-index: 1;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  align-items: center;
}
@media (min-width: 960px) {
  .hero-grid { grid-template-columns: 1fr 1.05fr; gap: 56px; }
}

.hero-copy { display: flex; flex-direction: column; gap: 0; }

.h1 {
  font-size: clamp(38px, 4.6vw, 58px);
  line-height: 1.08;
  letter-spacing: -0.03em;
  font-weight: 600;
  margin: 24px 0 0;
  color: var(--text);
}
.h1 em {
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  background: linear-gradient(120deg, #ffd984, var(--amber));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lede {
  font-size: 16.5px;
  line-height: 1.62;
  color: var(--text-2);
  margin: 22px 0 0;
  max-width: 30em;
}
.lede strong { color: var(--text); font-weight: 500; }

.field {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-radius: 13px;
  padding: 8px 14px;
  margin-top: 30px;
  transition: border-color .25s, box-shadow .25s;
}
.field.focused {
  border-color: rgba(255, 194, 75, 0.55);
  box-shadow: 0 0 0 4px rgba(255, 194, 75, 0.1);
}
.paw { flex-shrink: 0; font-size: 15px; filter: grayscale(0.2); }
.field input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 14.5px;
  min-width: 0;
  padding: 4px 0;
}
.field input::placeholder { color: var(--faint); }

.examples { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 16px 0 26px; }
.ex-lbl { font-size: 12px; color: var(--faint); margin-right: 2px; }
.chip {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.03);
  transition: all .18s;
}
.chip:hover { border-color: rgba(255, 194, 75, 0.4); color: #fff; transform: translateY(-1px); }

.hero-right { display: flex; align-items: stretch; gap: 24px; }
@media (max-width: 640px) { .hero-right { flex-direction: column; align-items: center; } }

.stage {
  flex: 1;
  min-width: 220px;
  position: relative;
  aspect-ratio: 1 / 1.08;
}
</style>
