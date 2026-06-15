<script setup lang="ts">
import { watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import type { CatsumRenderer, CatsumConfig, CatsumConfigOverrides } from 'catsum'

const props = defineProps<{ seed: string; overrides?: CatsumConfigOverrides; animate?: boolean }>()
const emit  = defineEmits<{ config: [config: CatsumConfig] }>()

const containerRef = useTemplateRef<HTMLDivElement>('container')

let cat: CatsumRenderer | null = null
let Renderer: typeof CatsumRenderer | null = null
let mountId = 0
// Serialized last-applied overrides — lets us skip setConfig() when only the seed changed.
let lastOverrides = ''

async function mount() {
  const id = ++mountId
  if (!containerRef.value) return

  // Lazy-load the library once. Rebuilding an SVG is cheap, so there is no
  // WebGL context to reuse — just swap markup in place.
  if (!Renderer) {
    const mod = await import('catsum')
    if (id !== mountId) return
    Renderer = mod.CatsumRenderer
  }

  const overridesKey = JSON.stringify(props.overrides ?? {})

  if (cat) {
    if (overridesKey !== lastOverrides) cat.setConfig(props.overrides ?? {})
    cat.update(props.seed)
  } else {
    cat = new Renderer(props.seed, {
      container: containerRef.value,
      config:    props.overrides,
      animate:   props.animate,
    })
  }
  lastOverrides = overridesKey
  emit('config', cat.config)
}

onMounted(mount)
watch([() => props.seed, () => props.overrides], mount, { deep: true })
onBeforeUnmount(() => cat?.destroy())
</script>

<template>
  <div class="cat-wrap">
    <div ref="container" class="cat-container" />
  </div>
</template>

<style scoped>
.cat-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Soft amber spotlight behind the cat — the cat is the hero. */
.cat-wrap::before {
  content: '';
  position: absolute;
  inset: -8%;
  background: radial-gradient(circle at 50% 46%, rgba(255, 194, 75, 0.18) 0%, transparent 62%);
  pointer-events: none;
  z-index: 0;
}

.cat-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-container :deep(svg) {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
