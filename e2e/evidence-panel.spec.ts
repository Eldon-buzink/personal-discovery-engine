import { test, expect } from '@playwright/test'

// "See what this is based on" on a report trait card (the sample report:
// no sign-in needed). Keyboard only: Tab reaches the button, Enter and Space
// toggle it, aria-expanded flips, focus stays on the button, and the panel
// it controls opens and closes.
test.describe('evidence panel', () => {
  test('keyboard: Tab, Enter, Space, aria-expanded', async ({ page }) => {
    await page.goto('/report/sample', { waitUntil: 'networkidle' })
    const button = page.locator('button.evidence-toggle')
    await expect(button).toHaveText(/See what this is based on/)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    const panelId = await button.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()

    // Tab until the toggle has focus.
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    for (let i = 0; i < 60; i++) {
      if (await button.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(button).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(button).toHaveText(/Hide what this is based on/)
    await expect(button).toBeFocused()
    const panel = page.locator(`[id="${panelId}"]`)
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Where you landed')).toBeVisible()
    await expect(panel.getByText('Two of your answers on this pattern')).toBeVisible()

    await page.keyboard.press('Space')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
    await expect(panel).toBeHidden()
  })
})
