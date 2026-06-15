<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import type { CatsumRenderer, ScalarParam, ChoiceParam } from 'catsum'

useSeoMeta({ title: 'catsum — Trait lab', robots: 'noindex' })

interface NumberKnob { kind: 'number'; path: string; mode: 'config' | 'dna'; min: number; max: number; step: number; value: number }
interface ChoiceKnob { kind: 'pick';   path: string; mode: 'config' | 'dna'; options: string[]; value: string }
type Knob = NumberKnob | ChoiceKnob
interface Section { title: string; knobs: Knob[] }

// '' in values means "seed-driven" for an unpinned pick() knob.
const SEED_DRIVEN = ''

const containerRef = useTemplateRef<HTMLDivElement>('container')
const seed     = ref('')
const loaded   = ref(false)
const copied   = ref(false)
const sections = ref<Section[]>([])
const values   = reactive<Record<string, number | string>>({})
const defaults = reactive<Record<string, number | string>>({})
// Current and default modes for number knobs — lets the user flip dna ↔ config at override time.
const modes    = reactive<Record<string, 'config' | 'dna'>>({})
const defModes = reactive<Record<string, 'config' | 'dna'>>({})

let cat: CatsumRenderer | null = null
let applyTimer: ReturnType<typeof setTimeout> | undefined

// ── Schema walking ────────────────────────────────────────────────────────────

function isScalarParam(v: unknown): v is ScalarParam {
  return typeof v === 'object' && v !== null && 'mode' in v && 'min' in v
}

function isChoiceParam(v: unknown): v is ChoiceParam {
  return typeof v === 'object' && v !== null && 'mode' in v && 'options' in v
}

/** Recursively collect all parameter leaves from the schema. */
function collectKnobs(obj: unknown, path: string[] = []): Knob[] {
  if (isScalarParam(obj)) {
    return [{ kind: 'number', path: path.join('.'), mode: obj.mode, min: obj.min, max: obj.max, step: obj.step, value: obj.value }]
  }
  if (isChoiceParam(obj)) {
    return [{ kind: 'pick', path: path.join('.'), mode: obj.mode, options: obj.options(), value: obj.value ?? SEED_DRIVEN }]
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj).flatMap(([k, v]) => collectKnobs(v, [...path, k]))
}

/** Derive a section title from a dot-path: 2 segments for deep paths, 1 for shallow. */
function sectionFor(path: string): string {
  const parts = path.split('.')
  const raw   = parts.slice(0, parts.length >= 3 ? 2 : 1).join(' ')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function setPath(obj: Record<string, any>, path: string, value: unknown): void {
  const keys = path.split('.')
  const last = keys.pop()!
  let cursor = obj
  for (const key of keys) cursor = (cursor[key] ??= {})
  cursor[last] = value
}

function labelFor(path: string): string {
  return path.split('.').at(-1)!.replace(/([A-Z])/g, ' $1').toLowerCase()
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function toggleMode(path: string): void {
  modes[path] = modes[path] === 'dna' ? 'config' : 'dna'
  scheduleApply()
}

function isKnobDirty(knob: Knob): boolean {
  if (knob.kind === 'pick') return values[knob.path] !== defaults[knob.path]
  if (modes[knob.path] !== defModes[knob.path]) return true
  return modes[knob.path] === 'config' && values[knob.path] !== defaults[knob.path]
}

// ── Overrides ─────────────────────────────────────────────────────────────────

// SEEDED is the override marker for "make this seed-generated" — what seeded()
// returns. We carry it as a plain object so it both applies live (mergeSchema
// understands it) and serializes back to a seeded() call in the copied code.
const SEEDED = { mode: 'dna' } as const

const changed = computed(() => {
  const result: Array<[string, unknown]> = []
  for (const path of Object.keys(values)) {
    if (path in defModes) {
      const cur = modes[path]
      if (cur === 'dna') {
        // seed-driven: only an override if it was pinned by default
        if (cur !== defModes[path]) result.push([path, SEEDED])
      } else {
        // pinned: emit a plain number when the mode flipped or the value changed
        if (cur !== defModes[path] || values[path] !== defaults[path]) result.push([path, values[path]])
      }
    } else {
      // pick param
      if (values[path] !== defaults[path]) result.push([path, values[path]])
    }
  }
  return result
})

const overrides = computed(() => {
  const result: Record<string, any> = {}
  for (const [path, value] of changed.value) setPath(result, path, value)
  return result
})

/** Pretty-print the overrides tree as a JS literal, rendering the seeded marker
 *  as a `seeded()` call so the copied snippet matches the public API. */
function serializeOverrides(obj: Record<string, any>, indent = 2): string {
  const pad = ' '.repeat(indent)
  const entries = Object.entries(obj).map(([k, v]) => {
    let val: string
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      val = v.mode === 'dna' ? 'seeded()' : serializeOverrides(v, indent + 2)
    } else {
      val = typeof v === 'string' ? `'${v}'` : String(v)
    }
    return `${pad}${k}: ${val}`
  })
  return `{\n${entries.join(',\n')}\n${' '.repeat(indent - 2)}}`
}

const usesSeeded = computed(() => changed.value.some(([, v]) => (v as any)?.mode === 'dna'))

const overridesCode = computed(() => {
  const body = serializeOverrides(overrides.value)
  const literal = `config: ${body}`
  return usesSeeded.value ? `import { seeded } from 'catsum'\n\n${literal}` : literal
})

function scheduleApply(): void {
  clearTimeout(applyTimer)
  applyTimer = setTimeout(() => cat?.setConfig(overrides.value), 80)
}

function resetAll(): void {
  for (const path of Object.keys(values)) values[path] = defaults[path]
  for (const path of Object.keys(modes)) modes[path] = defModes[path]
  scheduleApply()
}

async function copyOverrides(): Promise<void> {
  await navigator.clipboard.writeText(overridesCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function onSeedInput(): void {
  cat?.update(seed.value.trim() || 'catsum')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  const { CatsumRenderer, configSchema } = await import('catsum')

  // Walk configSchema to discover every knob — no manual list. c() knobs get
  // sliders; d() knobs render as seed-driven with a toggle to pin them; pick()
  // knobs get a select. Add/remove a knob or flip its mode by editing
  // c()/d()/pick() in src/config.ts.
  const allKnobs = collectKnobs(configSchema)

  const groups = new Map<string, Knob[]>()
  for (const knob of allKnobs) {
    const section = sectionFor(knob.path)
    const list = groups.get(section) ?? []
    list.push(knob)
    groups.set(section, list)
    if (knob.kind === 'number') {
      defModes[knob.path] = knob.mode
      modes[knob.path]    = knob.mode
      // knob.value is always set: fixed value for c(), midpoint for d()
      defaults[knob.path] = knob.value
      values[knob.path]   = knob.value
    } else {
      // pick knob — seed-driven by default unless the schema pins it
      defaults[knob.path] = knob.mode === 'config' ? knob.value : SEED_DRIVEN
      values[knob.path]   = knob.mode === 'config' ? knob.value : SEED_DRIVEN
    }
  }
  sections.value = [...groups.entries()].map(([title, knobs]) => ({ title, knobs }))
  loaded.value = true

  cat = new CatsumRenderer('catsum', { container: containerRef.value! })
})

onBeforeUnmount(() => {
  clearTimeout(applyTimer)
  cat?.destroy()
})
</script>

<template>
  <div class="config-page">

    <header class="header">
      <NuxtLink to="/" class="back-link">← catsum</NuxtLink>
      <h1>Trait lab</h1>
      <p class="sub">Tune every trait live, then copy the <code>config</code> override for <code>new CatsumRenderer()</code>.</p>
    </header>

    <div class="layout">

      <!-- ── Left: cat preview + output ──────────────────────────────────── -->
      <aside class="preview">
        <div ref="container" class="cat-box" />
        <input
          v-model="seed"
          class="seed-input"
          placeholder="catsum"
          autocomplete="off"
          spellcheck="false"
          @input="onSeedInput"
        />
        <div class="actions">
          <button class="btn ghost" :disabled="!changed.length" @click="resetAll">Reset</button>
          <button class="btn" :disabled="!changed.length" @click="copyOverrides">
            {{ copied ? 'Copied ✓' : `Copy ${changed.length} override${changed.length === 1 ? '' : 's'}` }}
          </button>
        </div>
        <pre v-if="changed.length" class="diff">{{ overridesCode }}</pre>
        <p v-else class="diff-empty">Move a control — changed values show up here.</p>
      </aside>

      <!-- ── Right: knobs ─────────────────────────────────────────────────── -->
      <main v-if="loaded" class="knobs">
        <section v-for="section in sections" :key="section.title" class="group">
          <h2>{{ section.title }}</h2>
          <div
            v-for="knob in section.knobs"
            :key="knob.path"
            class="knob"
            :class="{ dirty: isKnobDirty(knob) }"
          >
            <!-- Pick knob: always shows a select so any categorical can be pinned
                 from the lab even when seed-driven by default -->
            <template v-if="knob.kind === 'pick'">
              <label :for="knob.path" :title="knob.path">{{ labelFor(knob.path) }}</label>
              <select
                :id="knob.path"
                v-model="values[knob.path]"
                class="pick-select"
                @change="scheduleApply"
              >
                <option value="">seed-driven</option>
                <option v-for="opt in knob.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </template>

            <!-- Number knob: mode toggle in the label; slider when config, range when dna -->
            <template v-else>
              <label :for="knob.path" :title="knob.path">
                <span class="knob-name">{{ labelFor(knob.path) }}</span>
                <button
                  class="mode-toggle"
                  :class="modes[knob.path]"
                  :title="modes[knob.path] === 'dna' ? 'seed-driven — click to pin' : 'pinned — click to release'"
                  @click.prevent="toggleMode(knob.path)"
                >{{ modes[knob.path] === 'dna' ? 'dna' : 'pin' }}</button>
              </label>

              <template v-if="modes[knob.path] === 'config'">
                <input
                  :id="knob.path"
                  v-model.number="values[knob.path]"
                  type="range"
                  :min="knob.min"
                  :max="knob.max"
                  :step="knob.step"
                  @input="scheduleApply"
                />
                <input
                  v-model.number="values[knob.path]"
                  type="number"
                  :min="knob.min"
                  :max="knob.max"
                  :step="knob.step"
                  @input="scheduleApply"
                />
              </template>
              <span v-else class="dna-range">{{ knob.min }} – {{ knob.max }}</span>
            </template>
          </div>
        </section>
      </main>

    </div>
  </div>
</template>

<style scoped>
.config-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.header { margin-bottom: 28px; }

.back-link {
  font-size: 0.8rem;
  color: var(--muted);
  text-decoration: none;
}
.back-link:hover { color: var(--amber); }

.header h1 {
  margin: 10px 0 6px;
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffe9bd, var(--amber) 60%, #ff9d4b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sub {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.sub code {
  font-family: 'Consolas', 'SF Mono', monospace;
  color: var(--amber);
}

/* ── Layout ─────────────────────────────────────────────────────────────────── */
.layout {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
@media (min-width: 900px) {
  .layout {
    display: grid;
    grid-template-columns: 380px 1fr;
    align-items: start;
  }
  .preview { position: sticky; top: 24px; }
}

/* ── Preview column ─────────────────────────────────────────────────────────── */
.preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-box {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: radial-gradient(circle at 50% 46%, rgba(255, 194, 75, 0.12), rgba(0,0,0,0.25) 64%);
}
.cat-box :deep(svg) {
  width: 100%;
  height: 100%;
}

.seed-input {
  flex: 1;
  min-width: 0;
  padding: 9px 13px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.06);
  color: var(--text);
  font-size: 0.9rem;
  outline: none;
}
.seed-input:focus { border-color: rgba(255, 194, 75, 0.6); }

.btn {
  padding: 9px 16px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  background: linear-gradient(135deg, #ffd984, var(--amber));
  color: #2a1b04;
  white-space: nowrap;
}
.btn:hover:not(:disabled) { opacity: 0.88; }
.btn:disabled { opacity: 0.35; cursor: default; }
.btn.ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
}

.actions { display: flex; gap: 8px; }
.actions .btn { flex: 1; }

.diff {
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0,0,0,0.35);
  font-family: 'Consolas', 'SF Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.55;
  color: #ffe1a8;
  max-height: 320px;
  overflow: auto;
  white-space: pre;
}
.diff-empty {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.25);
}

/* ── Knobs column ───────────────────────────────────────────────────────────── */
.knobs {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
}
.group h2 {
  margin: 0 0 14px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--muted);
}

.knob {
  display: grid;
  grid-template-columns: 170px 1fr 86px;
  align-items: center;
  gap: 12px;
  padding: 3px 0;
}
.knob label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.55);
  overflow: hidden;
}
.knob.dirty label { color: var(--amber); }

.knob-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mode toggle pill — dna (amber) vs pin (muted) */
.mode-toggle {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  line-height: 1.5;
  transition: opacity 0.1s;
}
.mode-toggle.dna {
  background: rgba(255, 194, 75, 0.15);
  border-color: rgba(255, 194, 75, 0.35);
  color: var(--amber);
}
.mode-toggle.config {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.3);
}
.mode-toggle:hover { opacity: 0.75; }

.knob input[type='range'] {
  width: 100%;
  accent-color: var(--amber);
}

.knob input[type='number'] {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.05);
  color: var(--text);
  font-size: 0.76rem;
  font-family: 'Consolas', 'SF Mono', monospace;
  outline: none;
}
.knob input[type='number']:focus { border-color: rgba(255, 194, 75, 0.6); }

.dna-range {
  grid-column: 2 / -1;
  font-size: 0.74rem;
  font-family: 'Consolas', 'SF Mono', monospace;
  color: rgba(255,255,255,0.28);
}

.pick-select {
  grid-column: 2 / -1;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.05);
  color: var(--text);
  font-size: 0.76rem;
  font-family: 'Consolas', 'SF Mono', monospace;
  outline: none;
  cursor: pointer;
  appearance: auto;
}
.pick-select:focus { border-color: rgba(255, 194, 75, 0.6); }
.knob.dirty .pick-select { border-color: rgba(255, 194, 75, 0.4); }

@media (max-width: 560px) {
  .knob { grid-template-columns: 1fr 80px; }
  .knob label { grid-column: 1 / -1; }
}
</style>
