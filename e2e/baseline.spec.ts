import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Phase 2 baseline capture — see reference/landing-redesign.md section 10.
// Captures the CURRENT "/" page before any redesign work starts, so later
// changes (which land on a separate route, not a rewrite of this one) have
// something concrete to compare against. Does not touch app code.

const BASELINE_DIR = path.join(process.cwd(), 'reference', 'baseline')
fs.mkdirSync(BASELINE_DIR, { recursive: true })

function writeScrollHeight(name: string, scrollHeight: number) {
  const file = path.join(BASELINE_DIR, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify({ name, scrollHeight, capturedAt: new Date().toISOString() }, null, 2) + '\n')
}

async function captureBaseline(page: import('@playwright/test').Page, project: string, state: string) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  writeScrollHeight(`${state}-${project}`, scrollHeight)

  await page.screenshot({
    path: path.join(BASELINE_DIR, `${state}-${project}.png`),
    fullPage: true,
  })

  return scrollHeight
}

test.describe('baseline: cold visitor', () => {
  test('fresh, empty storage', async ({ page }, testInfo) => {
    // Fresh context per Playwright default (no storageState configured) —
    // no localStorage, no cookies, nothing to clear.
    const scrollHeight = await captureBaseline(page, testInfo.project.name, 'cold')
    expect(scrollHeight).toBeGreaterThan(0)
  })
})

test.describe('baseline: returning anonymous (unfinished progress)', () => {
  test('known_session with responses but no patterns yet', async ({ page }, testInfo) => {
    // Shape read by LandingPageClient.tsx's own restore effect: hasResponses
    // && !hasPatterns -> startedUnfinished -> hero CTA becomes "Continue your
    // assessment ->" instead of "Discover yourself ->". addInitScript runs
    // before any page script on every subsequent navigation in this context,
    // so this lands in localStorage before React reads it on first paint.
    await page.addInitScript(() => {
      const seeded = {
        questionOrder: [1, 2, 3, 4, 5],
        responses: [
          { questionId: 1, value: 3, answeredAt: new Date().toISOString() },
        ],
        patternContents: [],
      }
      window.localStorage.setItem('known_session', JSON.stringify(seeded))
    })

    const scrollHeight = await captureBaseline(page, testInfo.project.name, 'returning-anonymous')
    expect(scrollHeight).toBeGreaterThan(0)
  })
})
