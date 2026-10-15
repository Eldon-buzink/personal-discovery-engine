import { test, expect, type Page } from '@playwright/test'

// "See what this is based on" on a report trait card (the sample report:
// no sign-in needed). The button opens a dialog only when asked: role
// dialog, aria-modal, labelled by its title; focus moves in, stays in, and
// returns to the button; Escape, the backdrop and the close button close
// it; the carousel's arrow keys never fire from inside it; body scroll is
// locked while it is open.

// Safari (WebKit) moves to buttons and links with Option+Tab by default;
// plain Tab skips them. Use the key a Safari keyboard user would press.
async function tabTo(page: Page, target: ReturnType<Page['locator']>, tabKey: string) {
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press(tabKey)
  }
}

test.describe('evidence dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/report/sample', { waitUntil: 'networkidle' })
    const no = page.getByRole('button', { name: 'No thanks' })
    if (await no.count()) await no.click()
  })

  test('button, then a dialog on request: keyboard, aria, focus', async ({ page, browserName }) => {
    const tabKey = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
    const button = page.getByRole('button', { name: 'See what this is based on' })
    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)

    await tabTo(page, button, tabKey)
    await expect(button).toBeFocused()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'What this is based on' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = await dialog.getAttribute('aria-labelledby')
    await expect(page.locator(`[id="${labelledBy}"]`)).toHaveText('What this is based on')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    // Content: the sample's Cautiousness is mid, two answers, the count line.
    await expect(dialog.getByText('Where you landed')).toBeVisible()
    await expect(dialog.getByText('You land near the middle')).toBeVisible()
    await expect(dialog.getByText('Two of your answers on this pattern')).toBeVisible()
    await expect(dialog.getByText('You agreed')).toBeVisible()
    await expect(dialog.getByText('You disagreed')).toBeVisible()
    await expect(dialog.getByText('This comes from 4 statements in the assessment. It describes a tendency, not a diagnosis.')).toBeVisible()

    // Tab stays inside (one control: the close button).
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(button).toBeFocused()
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    // Space opens too; the close button closes and focus comes back.
    await page.keyboard.press('Space')
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(button).toBeFocused()
  })

  test('backdrop closes; arrow keys inside do not move the carousel; scroll lock', async ({ page }) => {
    const button = page.getByRole('button', { name: 'See what this is based on' })
    await button.scrollIntoViewIfNeeded()
    const activeBefore = await page.locator('[aria-current="true"], [aria-selected="true"]').first().textContent().catch(() => null)
    const scrollBefore = await page.evaluate(() => window.scrollY)

    await button.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await page.evaluate(() => document.body.style.position)).toBe('fixed')

    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('End')

    // The backdrop is the area outside the dialog box (top-left corner).
    await page.mouse.click(4, 4)
    await expect(dialog).toHaveCount(0)
    expect(await page.evaluate(() => document.body.style.position)).toBe('')
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThanOrEqual(1)
    const activeAfter = await page.locator('[aria-current="true"], [aria-selected="true"]').first().textContent().catch(() => null)
    expect(activeAfter).toBe(activeBefore)
  })
})
