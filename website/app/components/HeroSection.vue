<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CatsumConfig, CatsumConfigOverrides } from 'catsum'

const route  = useRoute()
const router = useRouter()

// The site is statically prerendered, so the query is empty at build time and a
// fixed value gets baked into the HTML. Start from that same value on the server,
// then read ?seed= on the client after mount (below) — reading it in the ref
// initialiser would run at prerender time and be ignored on the static build.
const inputValue      = ref('alice')
const caseInsensitive = ref(false)
const overrides  = ref<CatsumConfigOverrides>({})
const catConfig  = ref<CatsumConfig | null>(null)
const focused    = ref(false)
const copied     = ref(false)

const QUICK_PICKS = ['@satoshi', '0x71C7…976F', 'Orion-7', 'Mochi', 'DOC-99812']

// The hash is case-sensitive (charCodeAt), so 'Alice' and 'alice' draw different
// cats. The toggle lowercases the seed first when the user wants casing ignored.
const activeSeed = computed(() => {
  const raw = inputValue.value.trim() || 'catsum'
  return caseInsensitive.value ? raw.toLowerCase() : raw
})

// Keep the URL in sync so any cat is a shareable deep link. replace() (not push())
// keeps the back button clean; an empty field clears the query for a tidy URL.
watch(inputValue, (val) => {
  router.replace({ query: val.trim() ? { seed: val.trim() } : {} })
})

// Apply ?seed= once on the client so a shared link reopens the same cat. Runs
// after hydration, so there's no server/client mismatch on the static build.
onMounted(() => {
  const s = route.query.seed
  if (typeof s === 'string' && s.trim()) inputValue.value = s
})

function pick(val: string) { inputValue.value = val }

function share() {
  navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
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
              @focus="focused = true"
              @blur="focused = false"
            />
            <button
              class="case-toggle"
              :class="{ active: caseInsensitive }"
              type="button"
              :title="caseInsensitive ? 'Casing ignored — Aa = aa' : 'Casing matters — Aa ≠ aa'"
              @click="caseInsensitive = !caseInsensitive"
            >Aa</button>
            <button
              class="share-btn"
              :class="{ copied }"
              type="button"
              :title="copied ? 'Link copied' : 'Copy link to this cat'"
              @click="share"
            >
              <svg v-if="!copied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
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

.case-toggle {
  flex-shrink: 0;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1;
  color: var(--faint);
  background: rgba(255,255,255,.03);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all .18s;
}
.case-toggle:hover { color: var(--text-2); border-color: var(--line-2); }
.case-toggle.active {
  color: #15102b;
  background: var(--amber);
  border-color: var(--amber);
}

.share-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--text-2);
  background: rgba(255,255,255,.03);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: all .18s;
}
.share-btn:hover { color: #fff; border-color: var(--line-2); }
.share-btn.copied {
  color: oklch(0.75 0.14 150);
  border-color: oklch(0.75 0.14 150 / 0.5);
  background: oklch(0.75 0.14 150 / 0.1);
}

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
