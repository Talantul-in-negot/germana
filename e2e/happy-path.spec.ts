import { expect, test, type Page } from '@playwright/test'
const LINES = Array.from({ length: 50 }, (_, i) => `word${i} ; cuvânt${i}`)
const demo = new Map(LINES.map((_, i) => [`word${i}`, [`cuvânt${i}`]]))

/** Plays the open lesson to its end, answering matches correctly and others arbitrarily. */
async function playLesson(page: Page): Promise<void> {
  for (let step = 0; step < 150; step++) {
    if (await page.getByTestId('summary').isVisible()) return
    const check = page.getByTestId('check')
    const cont = page.getByTestId('continue')
    await expect(check.or(cont).or(page.getByTestId('summary'))).toBeVisible()
    if (await page.getByTestId('summary').isVisible()) return
    if (await cont.isVisible()) {
      await cont.click()
      await page.waitForTimeout(400) // let the exercise transition finish
      continue
    }
    const input = page.getByTestId('answer-input')
    if (await input.isVisible()) {
      const spoken = await page.evaluate(() => (window as unknown as { __spoken?: string }).__spoken ?? '')
      const shown = await page.getByTestId('prompt').isVisible()
      const prompt = shown ? ((await page.getByTestId('prompt').textContent()) ?? '').trim() : ''
      const answer = shown ? ([...demo.entries()].find(([, tr]) => tr[0] === prompt)?.[0] ?? 'zzz') : spoken
      await input.fill(answer)
      await check.click()
      continue
    }
    const sentence = page.getByTestId('sentence-line')
    if (await sentence.isVisible()) {
      await page.locator('main button.choice').first().click()
      await check.click()
      continue
    }
    const choices = page.locator('main button.choice')
    if (await page.getByRole('heading', { name: 'Potrivește perechile' }).isVisible()) {
      await expect(choices).toHaveCount(10)
      const texts = await choices.allTextContents()
      for (let i = 0; i < 5; i++) {
        const term = (texts[i] ?? '').trim()
        const tr = demo.get(term)?.[0] ?? ''
        await choices.nth(i).click()
        const idx = texts.findIndex((x, j) => j >= 5 && x.trim() === tr)
        await choices.nth(idx).click()
      }
      continue
    }
    // multiple choice: pick the right option when the prompt tells us the answer
    const spoken = await page.evaluate(() => (window as unknown as { __spoken?: string }).__spoken ?? '')
    const shown = await page.getByTestId('prompt').isVisible()
    const prompt = shown ? ((await page.getByTestId('prompt').textContent()) ?? '').trim() : spoken
    const want = !shown ? spoken : demo.has(prompt) ? (demo.get(prompt) as string[])[0] : [...demo.entries()].find(([, tr]) => tr[0] === prompt)?.[0]
    const right = want ? choices.filter({ hasText: new RegExp('^[0-9]' + want + '$') }) : choices
    await right.first().click()
    await check.click()
  }
  throw new Error('lesson did not finish')
}

test.setTimeout(120_000)
test('import 50 lines -> 5 units; play a lesson; progress survives reload', async ({ page }) => {
  await page.addInitScript(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { (window as unknown as { __spoken: string }).__spoken = u.text }
  })
  await page.goto('/')
  await expect(page.getByTestId('unit-0')).toBeVisible()
  await expect(page.getByTestId('unit-2')).toBeVisible() // demo deck: 30 words -> 3 units

  // --- import 50 lines
  await page.getByRole('link', { name: 'Pachete' }).click()
  await page.getByTestId('new-deck').click()
  await page.getByTestId('deck-name').fill('Test 50')
  const lines = Array.from({ length: 50 }, (_, i) => `word${i} ; cuvânt${i}`).join('\n')
  await page.getByTestId('paste-box').fill(lines)
  await expect(page.getByTestId('preview')).toContainText('50 rânduri valide')
  await page.getByTestId('save-import').click()
  await expect(page.getByTestId('unit-4')).toBeVisible()
  await expect(page.getByTestId('unit-5')).toHaveCount(0)

  // --- play the first lesson of the imported deck
  await page.getByTestId('unit-0').click()
  await page.getByTestId('start-lesson').click()
  await playLesson(page)
  await expect(page.getByTestId('summary')).toContainText('XP câștigat')
  await page.getByTestId('summary-home').click()
  await expect(page.getByTestId('streak')).toContainText('1')

  // --- persistence
  await page.reload()
  await expect(page.getByTestId('streak')).toContainText('1')
  await page.getByRole('link', { name: 'Progres' }).click()
  await expect(page.getByTestId('word-list').locator('li').first()).toBeVisible()
  await expect(page.getByTestId('mastered-pct')).toBeVisible()
})
