import { existsSync, readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// The site's address is the product's own, as gtm.js wrote it (src/pages.mjs).
const data = new URL('./src/data/site.json', import.meta.url)
const site = existsSync(data) ? JSON.parse(readFileSync(data, 'utf8')).product?.url : undefined

export default defineConfig({
  site: site || undefined,
  vite: { plugins: [tailwindcss()] },
})
