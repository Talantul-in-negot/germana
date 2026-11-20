// Renders public/icon.svg into the PNG icons required for installing the PWA on Android / iPhone.
// Usage: node scripts/make-icons.mjs   (needs the Playwright Chromium browser)
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const svg = readFileSync(join(root, 'icon.svg'), 'utf8')
const browser = await chromium.launch()
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`)
  await page.screenshot({ path: join(root, file), omitBackground: false })
  await page.close()
}
await browser.close()
console.log('icons written to', root)
