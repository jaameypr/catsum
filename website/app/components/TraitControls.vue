<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CatsumConfig, CatsumConfigOverrides } from 'catsum'

const props = defineProps<{ config: CatsumConfig | null }>()
const emit  = defineEmits<{ update: [overrides: CatsumConfigOverrides] }>()

const PATTERNS = ['solid', 'tabby', 'tuxedo', 'bicolor', 'calico', 'pointed', 'spotted']
const MOODS    = ['content', 'sleepy', 'grumpy', 'blep']

// Each trait is either seed-driven (pin = false → omitted from overrides, so the
// seed decides) or pinned (pin = true → a fixed value sent to setConfig()).
const pin  = reactive({ pattern: false, mood: false, hue: false, chonk: false, eyeHue: false })
const vals = reactive({ pattern: 'tabby', mood: 'content', hue: 30, chonk: 1.1, eyeHue: 120 })

// When a trait is seed-driven, mirror the live cat's value so the control reflects
// what the seed produced (and is ready to pin from there).
watch(() => props.config, (c) => {
  if (!c) return
  if (!pin.pattern) vals.pattern = c.coat.pattern
  if (!pin.mood)    vals.mood    = c.mood
  if (!pin.hue)     vals.hue     = Math.round(c.coat.hue)
  if (!pin.chonk)   vals.chonk   = Math.round(c.build.chonk * 100) / 100
  if (!pin.eyeHue)  vals.eyeHue  = Math.round(c.eye.hue)
}, { immediate: true })

function emitOverrides() {
  const o: Record<string, any> = {}
  if (pin.pattern || pin.hue) o.coat = {}
  if (pin.pattern) o.coat.pattern = vals.pattern
  if (pin.hue)     o.coat.hue     = vals.hue
  if (pin.chonk)   o.build = { chonk: vals.chonk }
  if (pin.eyeHue)  o.eye   = { hue: vals.eyeHue }
  if (pin.mood)    o.mood  = vals.mood
  emit('update', o as CatsumConfigOverrides)
}

function toggle(key: keyof typeof pin) { pin[key] = !pin[key]; emitOverrides() }
function onEdit(key: keyof typeof pin) { pin[key] = true; emitOverrides() }

function rerollAll() {
  pin.pattern = pin.mood = pin.hue = pin.chonk = pin.eyeHue = false
  emitOverrides()
}
</script>

<template>
  <div class="controls">
    <div class="ctrl-head">
      <span>Traits</span>
      <button class="reroll" @click="rerollAll">Re-roll all</button>
    </div>

    <!-- Coat pattern -->
    <div class="row">
      <button class="pin" :class="{ on: pin.pattern }" @click="toggle('pattern')">{{ pin.pattern ? 'pinned' : 'seed' }}</button>
      <label>Coat</label>
      <select v-model="vals.pattern" @change="onEdit('pattern')">
        <option v-for="p in PATTERNS" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <!-- Mood -->
    <div class="row">
      <button class="pin" :class="{ on: pin.mood }" @click="toggle('mood')">{{ pin.mood ? 'pinned' : 'seed' }}</button>
      <label>Mood</label>
      <select v-model="vals.mood" @change="onEdit('mood')">
        <option v-for="m in MOODS" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <!-- Coat hue -->
    <div class="row">
      <button class="pin" :class="{ on: pin.hue }" @click="toggle('hue')">{{ pin.hue ? 'pinned' : 'seed' }}</button>
      <label>Hue</label>
      <input type="range" min="0" max="360" step="1" v-model.number="vals.hue" @input="onEdit('hue')" />
      <span class="num">{{ vals.hue }}°</span>
    </div>

    <!-- Chonk -->
    <div class="row">
      <button class="pin" :class="{ on: pin.chonk }" @click="toggle('chonk')">{{ pin.chonk ? 'pinned' : 'seed' }}</button>
      <label>Chonk</label>
      <input type="range" min="0.8" max="1.42" step="0.01" v-model.number="vals.chonk" @input="onEdit('chonk')" />
      <span class="num">×{{ vals.chonk.toFixed(2) }}</span>
    </div>

    <!-- Eye hue -->
    <div class="row">
      <button class="pin" :class="{ on: pin.eyeHue }" @click="toggle('eyeHue')">{{ pin.eyeHue ? 'pinned' : 'seed' }}</button>
      <label>Eyes</label>
      <input type="range" min="35" max="215" step="1" v-model.number="vals.eyeHue" @input="onEdit('eyeHue')" />
      <span class="num">{{ vals.eyeHue }}°</span>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(13, 10, 30, 0.55);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 16px 18px;
}

.ctrl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 2px;
}
.reroll {
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--line-2);
  background: transparent;
  color: var(--amber);
  text-transform: none;
  letter-spacing: 0;
}
.reroll:hover { background: rgba(255, 194, 75, 0.1); }

.row {
  display: grid;
  grid-template-columns: 58px 44px 1fr auto;
  align-items: center;
  gap: 10px;
}
.row label { font-size: 12.5px; color: var(--text-2); }

.pin {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .04em;
  cursor: pointer;
  padding: 3px 0;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.03);
  color: var(--muted);
}
.pin.on {
  background: rgba(255, 194, 75, 0.14);
  border-color: rgba(255, 194, 75, 0.4);
  color: var(--amber);
}

.row select,
.row input[type='range'] { width: 100%; min-width: 0; }
.row select {
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid var(--line-2);
  background: rgba(255,255,255,.05);
  color: var(--text);
  font-size: 12.5px;
  text-transform: capitalize;
  outline: none;
}
.row input[type='range'] { accent-color: var(--amber); }
.num {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 11px;
  color: var(--text);
  min-width: 38px;
  text-align: right;
}
</style>
