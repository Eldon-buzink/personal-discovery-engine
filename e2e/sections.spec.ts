import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Retargeted from the old /home-v2 skeleton route to the real landing page
// ("/", LandingPageClient.tsx) once that redesign work landed in place.
// Uses locator.screenshot() (an element crop), not a full-page capture:
// full-page screenshots mis-stitch position:fixed elements (SiteNav's <nav>),
// confirmed in an earlier phase by comparing a full-page capture against a
// viewport-only one at a mid-scroll position. Element screenshots don't have
// this problem since they never touch the fixed nav at all.

const OUT_DIR = path.join(process.cwd(), 'reference', 'final')
fs.mkdirSync(OUT_DIR, { recursive: true })

function writeScrollHeight(name: string, scrollHeight: number) {
  const file = path.join(OUT_DIR, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify({ name, scrollHeight, capturedAt: new Date().toISOString() }, null, 2) + '\n')
}

test.describe('sections: cold visitor', () => {
  test('per-section screenshots', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    // Fresh context per Playwright default (no storageState configured) —
    // no localStorage, no cookies, nothing to clear. Matches
    // baseline.spec.ts's own "cold visitor" state.
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    writeScrollHeight(`scroll-height-${project}`, scrollHeight)
    expect(scrollHeight).toBeGreaterThan(0)

    // No horizontal scroll at mobile width — the one width narrow enough for
    // an overflow regression to actually show up.
    if (project === 'mobile') {
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    }

    // SiteNav's <nav> is fixed at the top of every page; not part of the
    // section being reviewed, and would otherwise bleed into whichever
    // section happens to scroll to the same screen position.
    await page.addStyleTag({ content: 'nav { display: none !important; }' })

    const shots: Array<[string, string]> = [
      ['hero', '.hero'],
      ['problem', '.problem-section'],
      ['what-you-get', '.bento-section'],
      ['why-different', '.usp-section'],
      ['how-it-works', '.how'],
      ['final-cta', '.final-outer'],
    ]

    for (const [name, selector] of shots) {
      const locator = page.locator(selector)
      await expect(locator).toBeVisible()
      await locator.screenshot({ path: path.join(OUT_DIR, `${name}-${project}.png`) })
    }

    // FAQ closed
    const faq = page.locator('.faq-section')
    await faq.screenshot({ path: path.join(OUT_DIR, `faq-closed-${project}.png`) })

    // FAQ with the first item open
    await page.locator('.faq-item').first().click()
    await page.waitForTimeout(400) // let the max-height transition finish
    await faq.screenshot({ path: path.join(OUT_DIR, `faq-open-${project}.png`) })
  })
})
