<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import type { SeedstoneRenderer, SeedstoneConfig, SeedstoneConfigOverrides } from 'seedstone'

const props = defineProps<{ seed: string; cut?: string }>()
const emit  = defineEmits<{ config: [config: SeedstoneConfig] }>()

const containerRef = useTemplateRef<HTMLDivElement>('container')
const loading      = ref(true)

let gem:      SeedstoneRenderer | null = null
let Renderer: typeof SeedstoneRenderer | null = null
let ro:       ResizeObserver | null = null
// Counter to cancel superseded async mount calls
let mountId = 0
// Last applied cut — lets us skip setConfig() when only the seed changed
let lastCut: string | undefined

function overrides(): SeedstoneConfigOverrides {
  return props.cut ? { gem: { cut: props.cut } } : {}
}

async function mount(seed: string) {
  const id = ++mountId
  if (!containerRef.value) return

  // Lazy-load the library once
  if (!Renderer) {
    const mod = await import('seedstone')
    if (id !== mountId) return   // a newer call already took over
    Renderer = mod.SeedstoneRenderer
  }

  // Reuse the existing WebGL context — config resolves immediately and the
  // scene reconciles in place off the render path. Only re-apply overrides when
  // the cut actually changed; otherwise a seed change is just update().
  if (gem) {
    if (props.cut !== lastCut) gem.setConfig(overrides())
    gem.update(seed)
  } else {
    loading.value = true
    const size = containerRef.value.clientWidth || 420
    gem = new Renderer(seed, {
      container:  containerRef.value,
      width:      size,
      height:     size,
      background: null,
      config:     overrides(),
    })
    loading.value = false
  }
  lastCut = props.cut
  emit('config', gem.config)
}

onMounted(() => {
  mount(props.seed)

  ro = new ResizeObserver(() => {
    if (gem && containerRef.value) {
      const s = containerRef.value.clientWidth
      gem.resize(s, s)
    }
  })
  ro.observe(containerRef.value!)
})

// Single combined watch — seed and cut often change together (gallery picks),
// so one watcher avoids calling mount() twice per pick.
watch([() => props.seed, () => props.cut], () => mount(props.seed))

onBeforeUnmount(() => {
  gem?.destroy()
  ro?.disconnect()
})
</script>

<template>
  <div class="gem-wrap">
    <div ref="container" class="gem-container">
      <div v-if="loading" class="spinner" />
    </div>
  </div>
</template>

<style scoped>
.gem-wrap {
  position: relative;
  width: min(420px, 90vw);
  height: min(420px, 90vw);
}

.gem-wrap::before {
  content: '';
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(167,139,250,0.18) 0%, transparent 70%);
  animation: pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 1.0; transform: scale(1.06); }
}

.gem-container {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
}

.spinner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
}
.spinner::after {
  content: '';
  width: 36px;
  height: 36px;
  border: 3px solid rgba(167,139,250,0.25);
  border-top-color: #ce93d8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
