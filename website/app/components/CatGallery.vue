<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ pick: [seed: string] }>()

const SEEDS = ['Mochi', 'satoshi', '0x71C7', 'Orion-7', 'Pumpkin', 'agent://atlas', 'DOC-99812', 'Waffle']

// Each thumbnail is a pure SVG string — no canvas, no per-cell renderer instance.
const svgs = ref<Record<string, string>>({})

onMounted(async () => {
  const { renderCatSvg } = await import('catsum')
  const out: Record<string, string> = {}
  for (const s of SEEDS) out[s] = renderCatSvg(s)
  svgs.value = out
})
</script>

<template>
  <section class="gallery">
    <div class="g-title">Eight strings, eight cats</div>
    <div class="grid">
      <button
        v-for="s in SEEDS"
        :key="s"
        class="cell"
        :title="`Load ${s}`"
        @click="emit('pick', s)"
      >
        <!-- Trusted, self-generated SVG markup (no external/user HTML). -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="thumb" v-html="svgs[s] ?? ''" />
        <span class="lbl">{{ s }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.gallery { width: 100%; margin-top: 56px; }
.g-title {
  text-align: center;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (min-width: 560px) { .grid { grid-template-columns: repeat(4, 1fr); } }

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.02);
  transition: transform .2s, border-color .2s;
}
.cell:hover { transform: translateY(-4px); border-color: rgba(255, 194, 75, 0.4); }

.thumb {
  width: 100%;
  aspect-ratio: 1;
  background: radial-gradient(circle at 50% 46%, rgba(255, 194, 75, 0.12), transparent 60%);
}
.thumb :deep(svg) { width: 100%; height: 100%; }

.lbl {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  color: var(--muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
