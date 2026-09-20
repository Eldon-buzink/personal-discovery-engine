import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Phase 3c, task 7 — per-section element screenshots of /home-v2, cold state
// only. Uses locator.screenshot() (an element crop), not a full-page capture:
// full-page screenshots mis-stitch position:fixed elements (the sticky bar),
// confirmed in an earlier phase by comparing a full-page capture against a
// viewport-only one at a mid-scroll position. Element screenshots don't have
// this problem since they never touch the fixed-position sticky bar at all.

const SECTIONS_DIR = path.join(process.cwd(), 'reference', 'skeleton', 'sections')
fs.mkdirSync(SECTIONS_DIR, { recursive: true })

test.describe('sections: cold visitor', () => {
  test('per-section screenshots', async ({ page }, testInfo) => {
    const project = testInfo.project.name
    await page.goto('/home-v2', { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    // Phase 3d, task 4: hide fixed elements so they never appear in a crop.
    // SiteNav's <nav> is fixed at the top of every page; .hv2-sticky-bar is
    // fixed at the bottom on mobile. Neither is part of the section being
    // reviewed, and only the FAQ crops actually overlapped the nav before
    // this (the nav happened to sit at the same screen position the FAQ
    // section scrolled to).
    await page.addStyleTag({ content: 'nav, .hv2-sticky-bar { display: none !important; }' })

    const shots: Array<[string, string]> = [
      ['hero', '[data-testid="section-hero"]'],
      ['example-card', '.app-card'],
      ['problem', '[data-testid="section-problem"]'],
      ['why-different', '[data-testid="section-why-different"]'],
      ['how-it-works', '[data-testid="section-how-it-works"]'],
      ['final-cta', '.final-outer'],
    ]

    for (const [name, selector] of shots) {
      const locator = page.locator(selector)
      await expect(locator).toBeVisible()
      await locator.screenshot({ path: path.join(SECTIONS_DIR, `${name}-${project}.png`) })
    }

    // FAQ closed
    const faq = page.locator('[data-testid="section-faq"]')
    await faq.screenshot({ path: path.join(SECTIONS_DIR, `faq-closed-${project}.png`) })

    // FAQ with one item open ("Do I need an account?" — has a real answer)
    await faq.getByText('Do I need an account?').click()
    await page.waitForTimeout(400) // let the max-height transition finish
    await faq.screenshot({ path: path.join(SECTIONS_DIR, `faq-open-${project}.png`) })
  })
})
