import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Phase 3 skeleton checks for the temporary /home-v2 route — see
// reference/landing-redesign.md section 10. Mirrors e2e/baseline.spec.ts's
// cold/returning shape so the two are directly comparable.

const SKELETON_DIR = path.join(process.cwd(), 'reference', 'skeleton')
fs.mkdirSync(SKELETON_DIR, { recursive: true })

function writeScrollHeight(name: string, scrollHeight: number) {
  const file = path.join(SKELETON_DIR, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify({ name, scrollHeight, capturedAt: new Date().toISOString() }, null, 2) + '\n')
}

async function captureSkeleton(page: import('@playwright/test').Page, project: string, state: string) {
  await page.goto('/home-v2', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  writeScrollHeight(`${state}-${project}`, scrollHeight)

  await page.screenshot({
    path: path.join(SKELETON_DIR, `${state}-${project}.png`),
    fullPage: true,
  })

  return scrollHeight
}

test.describe('skeleton: cold visitor', () => {
  test('fresh, empty storage', async ({ page }, testInfo) => {
    const scrollHeight = await captureSkeleton(page, testInfo.project.name, 'cold')
    expect(scrollHeight).toBeGreaterThan(0)

    // No horizontal overflow at 390px (only meaningful on the mobile project,
    // but harmless to assert on desktop too — always false there).
    if (testInfo.project.name === 'mobile') {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    }
  })
})

test.describe('skeleton: returning (unfinished progress)', () => {
  test('known_session with responses but no patterns yet', async ({ page }, testInfo) => {
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

    const scrollHeight = await captureSkeleton(page, testInfo.project.name, 'returning')
    expect(scrollHeight).toBeGreaterThan(0)

    // CTA rule: startedUnfinished swaps every CTA's label/destination.
    const heroLabel = await page.locator('[data-testid="cta-hero"]').textContent()
    expect(heroLabel?.trim()).toBe('Continue your assessment')
    const heroHref = await page.locator('[data-testid="cta-hero"]').locator('xpath=..').getAttribute('href')
    expect(heroHref).toBe('/assessment')

    if (testInfo.project.name === 'mobile') {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    }
  })
})

test.describe('skeleton: CTA fresh-state assertions', () => {
  test('fresh visitor sees "Start the assessment" everywhere, pointing at /onboarding', async ({ page }) => {
    await page.goto('/home-v2', { waitUntil: 'networkidle' })
    for (const variant of ['hero', 'mid', 'final', 'sticky']) {
      const btn = page.locator(`[data-testid="cta-${variant}"]`)
      await expect(btn).toHaveText('Start the assessment')
      const href = await btn.locator('xpath=..').getAttribute('href')
      expect(href).toBe('/onboarding')
    }
  })
})

test.describe('skeleton: welcome-back magic-link request', () => {
  test('clicking "Continue where you left off" calls signInWithOtp without sending a real email', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'known_session',
        JSON.stringify({ questionOrder: [], responses: [{ questionId: 1, value: 3, answeredAt: new Date().toISOString() }], patternContents: [{ facet: 'Cautiousness' }] })
      )
    })

    let otpRequestSeen = false
    // Intercept and fulfill locally — the real Supabase endpoint is never
    // reached, so no email is ever actually sent, per the task's instruction.
    await page.route('**/auth/v1/otp*', async (route) => {
      otpRequestSeen = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/home-v2', { waitUntil: 'networkidle' })

    const link = page.locator('[data-testid="continue-where-left-off"]')
    await expect(link).toBeVisible()
    await link.click()

    await page.locator('[data-testid="continue-link-email"]').fill('test@example.com')
    await page.locator('[data-testid="continue-link-send"]').click()

    await expect(page.locator('[data-testid="continue-link-sent"]')).toBeVisible()
    expect(otpRequestSeen).toBe(true)
  })
})
