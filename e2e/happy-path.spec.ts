import { expect, test, type Page } from '@playwright/test'

const LINES = Array.from({ length: 50 }, (_, i) => `word${i} ; cuvânt${i}`)
const demo = new Map(LINES.map((_, i) => [`word${i}`, [`cuvânt${i}`]]))

async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        ;(window as unknown as { __spoken: string }).__spoken = u.text
      }
    }
  })
}

const spokenText = (page: Page): Promise<string> => page.evaluate(() => (window as unknown as { __spoken?: string }).__spoken ?? '')

/** Plays the open lesson to its end, answering matches correctly and others from what is shown or spoken. */
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
    const spoken = await spokenText(page)
    const shown = await page.getByTestId('prompt').isVisible()
    const input = page.getByTestId('answer-input')
    if (await input.isVisible()) {
      const prompt = shown ? ((await page.getByTestId('prompt').textContent()) ?? '').trim() : ''
      const answer = shown ? ([...demo.entries()].find(([, tr]) => tr[0] === prompt)?.[0] ?? 'zzz') : spoken
      await input.fill(answer)
      await check.click()
      continue
    }
    if (await page.getByTestId('sentence-line').isVisible()) {
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
    // multiple choice: pick the right option when the prompt (or the spoken word) tells us the answer
    const prompt = shown ? ((await page.getByTestId('prompt').textContent()) ?? '').trim() : spoken
    const candidates = demo.has(prompt)
      ? [(demo.get(prompt) as string[])[0] as string]
      : [[...demo.entries()].find(([, tr]) => tr[0] === prompt)?.[0] ?? '', demo.get(spoken)?.[0] ?? '', spoken]
    let target = choices
    for (const c of candidates) {
      if (!c) continue
      const f = choices.filter({ hasText: new RegExp('^[0-9]' + c + '$') })
      if ((await f.count()) > 0) {
        target = f
        break
      }
    }
    await target.first().click()
    await check.click()
  }
  throw new Error('lesson did not finish')
}

test.setTimeout(120_000)

test('import 50 lines -> 5 units; play a lesson; progress survives reload', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/')
  await expect(page.getByTestId('unit-0')).toBeVisible()

  // --- import 50 lines
  await page.getByRole('link', { name: 'Pachete' }).click()
  await expect(page.getByTestId('deck-card')).toHaveCount(7) // the German demo lessons
  await page.getByTestId('new-deck').click()
  await page.getByTestId('deck-name').fill('Test 50')
  await page.getByTestId('paste-box').fill(LINES.join('\n'))
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

test('German import preview, "Test lecție" with a saved report, install screen', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Pachete' }).click()
  await page.getByTestId('new-deck').click()
  await page.getByTestId('deck-name').fill('Lektion 9 – Haus')
  await page.getByTestId('deck-course').fill('Menschen A1')
  await page.getByTestId('paste-box').fill('die Mutter, ¨- ; mama\ndas Haus, ¨-er ; casa\nder Tisch, -e ; masa')
  await expect(page.getByTestId('preview')).toContainText('3 rânduri valide')
  await expect(page.getByTestId('plural-input').first()).toHaveValue('Mütter')
  await page.getByTestId('save-import').click()
  await expect(page.getByTestId('unit-0')).toBeVisible()

  // --- lesson test: every word DE->RO and RO->DE
  await page.getByRole('link', { name: 'Pachete' }).click()
  await page.locator('[data-testid="deck-card"]', { hasText: 'Lektion 9' }).getByTestId('test-btn').click()
  await page.getByTestId('test-start').click()
  const answers: Record<string, string> = { 'die Mutter': 'mama', mama: 'die Mutter', 'das Haus': 'casa', casa: 'das Haus', 'der Tisch': 'masa', masa: 'der Tisch' }
  for (let i = 0; i < 6; i++) {
    const prompt = ((await page.getByTestId('prompt').textContent()) ?? '').trim()
    await page.getByTestId('answer-input').fill(answers[prompt] ?? 'zzz')
    await page.getByTestId('test-next').click()
    await page.waitForTimeout(100)
  }
  await expect(page.getByTestId('test-result').first()).toBeVisible()
  await expect(page.getByTestId('test-score').first()).toHaveText('100%')
  await expect(page.getByTestId('test-verdict').first()).toContainText('verificată')
  await expect(page.getByTestId('test-table').first().locator('tbody tr')).toHaveCount(3)
  await expect(page.getByTestId('test-history').locator('li')).toHaveCount(1)
  await page.getByRole('button', { name: /înapoi/i }).click()
  await expect(page.getByTestId('verified').first()).toBeVisible()

  // --- install screen
  await page.getByRole('link', { name: 'Setări' }).click()
  await page.getByTestId('install-link').click()
  await expect(page.getByTestId('install-screen')).toBeVisible()
  await expect(page.getByTestId('iphone-warning')).toContainText('ecranul principal')
})

test('app launches offline after the first visit', async ({ page, context }) => {
  await stubSpeech(page)
  await page.goto('/')
  await expect(page.getByTestId('unit-0')).toBeVisible()
  // the service worker precaches the shell: reload while offline still works
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('unit-0')).toBeVisible()
  await context.setOffline(false)
})

test('Conjugare haben: stage 1 with a repeated wrong row; stage 2 stays locked on the same day', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Pachete' }).click()
  await page.locator('[data-testid="deck-card"]', { hasText: 'Verben' }).getByRole('link').first().click()
  await page.getByTestId('conj-btn-haben').click()
  await expect(page.getByTestId('conj-menu')).toBeVisible()
  await expect(page.getByTestId('stage-2')).toHaveAttribute('data-state', 'locked')
  await page.getByTestId('start-stage-1').click()

  const haben: Record<string, string> = { ich: 'habe', du: 'hast', 'er/sie/es': 'hat', wir: 'haben', ihr: 'habt', 'Sie/sie': 'haben' }
  const order: string[] = []
  let wrongOnce = false
  for (let i = 0; i < 12; i++) {
    await expect(page.getByTestId('conj-row').or(page.getByTestId('conj-result'))).toBeVisible()
    if (await page.getByTestId('conj-result').isVisible()) break
    const person = ((await page.getByTestId('prompt').textContent()) ?? '').replace(/\s+/g, ' ').trim().split(' ')[0] as string
    order.push(person)
    // the card is visible in stage 1
    await expect(page.getByTestId('conj-card')).toBeVisible()
    const select = page.getByTestId('conj-select')
    if (person === 'du' && !wrongOnce) {
      wrongOnce = true
      const options = await select.locator('option').allTextContents()
      const wrong = options.find((o) => o && o !== 'hast' && o !== 'alege…') as string
      await select.selectOption({ label: wrong })
      await page.getByTestId('check').click()
      await expect(page.getByTestId('person-note')).toContainText('După «du» urmează hast, nu ' + wrong)
    } else {
      await select.selectOption({ label: haben[person] as string })
      await page.getByTestId('check').click()
    }
    await page.getByTestId('continue').click()
  }
  await expect(page.getByTestId('conj-result')).toBeVisible()
  // notebook order first, the wrong row repeated at the end
  expect(order.slice(0, 6)).toEqual(['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'Sie/sie'])
  expect(order).toHaveLength(7)
  expect(order[6]).toBe('du')
  await expect(page.getByTestId('conj-result')).toContainText('Etapă trecută')
  await page.getByTestId('conj-back').click()
  await expect(page.getByTestId('stage-1')).toHaveAttribute('data-state', 'passed')
  await expect(page.getByTestId('stage-2')).toHaveAttribute('data-state', 'locked') // opens on a later day
  await expect(page.getByTestId('start-stage-2')).toBeDisabled()
})
