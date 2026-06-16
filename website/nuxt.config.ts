// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  // Static site generation. catsum renders plain SVG, so the cat could be drawn
  // server-side too; the interactive viewer is wrapped in <ClientOnly> only so its
  // keystroke updates stay on the client. The output lands in .output/public/.
  nitro: {
    preset: 'static',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#15102b' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.ico' },
      ],
    },
  },

  // The alias points straight at the ESM dist so Vite never tries to pre-bundle
  // it (which would break the dynamic import() pattern used in the components).
  vite: {
    resolve: {
      alias: {
        'catsum': new URL('../dist/catsum.esm.js', import.meta.url).pathname,
      },
    },
    optimizeDeps: {
      exclude: ['catsum'],
    },
  },
})
