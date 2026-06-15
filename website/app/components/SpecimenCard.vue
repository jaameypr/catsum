<script setup lang="ts">
import { computed } from 'vue'
import type { CatsumConfig } from 'catsum'

const props = defineProps<{ config: CatsumConfig | null }>()

/** Map a value onto a 3–100% bar within its declared range. */
function pct(v: number, lo: number, hi: number): number {
  return Math.max(3, Math.min(100, Math.round(((v - lo) / (hi - lo)) * 100)))
}

const stats = computed(() => {
  const c = props.config
  if (!c) return []
  return [
    { label: 'Chonk', pct: pct(c.build.chonk, 0.80, 1.42), value: `×${c.build.chonk.toFixed(2)}` },
    { label: 'Coat',  pct: Math.round(c.coat.saturation * 100), value: `${Math.round(c.coat.saturation * 100)}%` },
    { label: 'Head',  pct: pct(c.head.size, 0.88, 1.14), value: c.head.size.toFixed(2) },
    { label: 'Ears',  pct: pct(c.ear.size, 0.82, 1.22), value: c.ear.size.toFixed(2) },
    { label: 'Eyes',  pct: pct(c.eye.size, 0.78, 1.28), value: c.eye.size.toFixed(2) },
  ]
})

const facts = computed(() => {
  const c = props.config
  if (!c) return []
  return [
    { k: 'Coat',  v: c.coat.pattern },
    { k: 'Mood',  v: c.mood },
    { k: 'Hue',   v: `${Math.round(c.coat.hue)}°`, swatch: c.colors.base },
    { k: 'Iris',  v: `${Math.round(c.eye.hue)}°`, swatch: c.colors.eyeL },
  ]
})
</script>

<template>
  <aside class="card">
    <div class="card-h">
      <span class="diamond" />
      Profile
    </div>

    <div class="name-row">
      <span class="name">{{ config?.specimen.name ?? '—' }}</span>
      <span class="sw" :style="{ background: config?.colors.base, boxShadow: `0 0 16px -2px ${config?.colors.base}` }" />
    </div>
    <div class="breed">{{ config?.specimen.breed ?? '' }}</div>

    <div class="stats">
      <div v-for="s in stats" :key="s.label" class="stat">
        <span class="sk">{{ s.label }}</span>
        <span class="track"><i :style="{ width: s.pct + '%' }" /></span>
        <span class="sv">{{ s.value }}</span>
      </div>
    </div>

    <div class="facts">
      <div v-for="fct in facts" :key="fct.k" class="fact">
        <span class="fk">{{ fct.k }}</span>
        <span class="fv">
          <span v-if="fct.swatch" class="dot" :style="{ background: fct.swatch }" />
          {{ fct.v }}
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.card {
  flex: 0 0 240px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  background: rgba(13, 10, 30, 0.74);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  padding: 22px 18px;
  box-shadow: 0 28px 70px -34px #000, 0 0 70px -30px rgba(255, 194, 75, 0.25);
}
@media (max-width: 640px) {
  .card { flex: 0 0 auto; width: 100%; max-width: 320px; align-self: center; }
}

.card-h {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--amber);
}
.diamond {
  width: 10px; height: 10px;
  transform: rotate(45deg);
  border-radius: 2px;
  background: var(--amber);
  box-shadow: 0 0 8px 0 rgba(255, 194, 75, 0.7);
}

.name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.name {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}
.sw {
  width: 30px; height: 30px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,.16);
  flex-shrink: 0;
  transition: background .4s, box-shadow .4s;
}
.breed {
  font-size: 13px;
  color: var(--muted);
  margin-top: -6px;
}

.stats { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--line); padding-top: 10px; }
.stat {
  display: grid;
  grid-template-columns: 46px 1fr 40px;
  align-items: center;
  gap: 12px;
  padding: 3px 0;
}
.sk { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.track { height: 5px; border-radius: 4px; background: rgba(255,255,255,.08); overflow: hidden; }
.track i {
  display: block; height: 100%; border-radius: 4px; width: 0;
  background: linear-gradient(90deg, #ffd984, var(--amber));
  transition: width .6s cubic-bezier(.2,.7,.2,1);
}
.sv { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 10px; color: var(--text); text-align: right; }

.facts { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--line); padding-top: 10px; }
.fact {
  display: flex; justify-content: space-between; align-items: center;
  padding: 3px 0;
  font-size: 12px;
}
.fk { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.fv { display: inline-flex; align-items: center; gap: 6px; color: var(--text); text-transform: capitalize; }
.dot { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,.18); }
</style>
