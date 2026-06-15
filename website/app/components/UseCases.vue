<script setup lang="ts">
import { ref, onMounted } from 'vue'

const USE_CASES = [
  { seed: 'agent://atlas',     title: 'AI agents',           tag: 'Per-agent identity', desc: 'Give every autonomous agent a face that follows it across logs, dashboards, and handoffs.' },
  { seed: '0x71C7856E9D4a4C6A', title: 'Wallets',            tag: 'Crypto & Web3',      desc: 'Turn an unreadable address into a recognizable cat. Spot your wallet at a glance, no hex required.' },
  { seed: 'api_key_7731',      title: 'Developer platforms', tag: 'Keys & services',    desc: 'Deterministic avatars for keys, services, and endpoints. Generated on the fly, never stored.' },
  { seed: 'Helix Collective',  title: 'Teams & communities', tag: 'Groups & spaces',    desc: 'Memorable mascots for squads, guilds, and spaces that feel earned and permanent.' },
  { seed: 'DOC-99812',         title: 'Documents & records', tag: 'Files & ledgers',    desc: 'Fingerprint files, invoices, and records so any item is identifiable at a glance.' },
  { seed: '@satoshi',          title: 'People & profiles',   tag: 'Usernames',          desc: 'A profile identity that is unique, consistent, and impossible to spoof by sight.' },
]

const svgs = ref<Record<string, string>>({})

onMounted(async () => {
  const { renderCatSvg } = await import('catsum')
  const out: Record<string, string> = {}
  for (const uc of USE_CASES) out[uc.seed] = renderCatSvg(uc.seed)
  svgs.value = out
})
</script>

<template>
  <section id="cases" class="section-cases reveal">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow">Where it lives</span>
        <h2 class="sec-h2">A visual identity layer<br>for everything.</h2>
        <p class="sec-lede">Wherever an identifier appears, a catsum makes it instantly recognizable — and impossible to confuse.</p>
      </div>
      <div class="uc-grid">
        <div v-for="uc in USE_CASES" :key="uc.seed" class="uc">
          <!-- Trusted, self-generated SVG markup (no external/user HTML). -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="ucg" v-html="svgs[uc.seed] ?? ''" />
          <h3>{{ uc.title }}</h3>
          <p>{{ uc.desc }}</p>
          <span class="uc-tag">{{ uc.tag }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-cases {
  width: 100%;
  padding: 80px 0;
  position: relative;
  z-index: 1;
}

.sec-head { max-width: 42em; margin-bottom: 42px; }
.sec-h2 {
  font-size: clamp(28px, 3.4vw, 40px);
  letter-spacing: -0.025em;
  font-weight: 600;
  line-height: 1.08;
  margin-top: 14px;
  color: var(--text);
}
.sec-lede {
  color: var(--text-2);
  font-size: 17px;
  margin-top: 14px;
  line-height: 1.6;
  max-width: 34em;
}

.uc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 860px) { .uc-grid { grid-template-columns: 1fr; } }

.uc {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 24px;
  transition: border-color .25s, transform .25s;
  position: relative;
  overflow: hidden;
}
.uc:hover { border-color: var(--line-2); transform: translateY(-3px); }

.ucg {
  width: 104px;
  height: 104px;
  margin-bottom: 6px;
  background: radial-gradient(circle at 50% 45%, rgba(255, 194, 75, 0.14), transparent 66%);
  border-radius: 12px;
  overflow: hidden;
}
.ucg :deep(svg) { width: 100%; height: 100%; }

.uc h3 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin-top: 10px;
  color: var(--text);
}
.uc p { color: var(--muted); font-size: 14px; margin-top: 8px; line-height: 1.58; }
.uc-tag {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--amber);
  margin-top: 14px;
  display: block;
}
</style>
