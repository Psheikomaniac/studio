import { test, expect } from '@playwright/test'

test.describe('Darkmode', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from a clean state
    await page.goto('/')
  })

  test('applies localStorage theme at first paint (no FOUC)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('toggle persists selection across reloads', async ({ page }) => {
    // start from light
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light')
    })
    await page.goto('/dashboard')

    // Open Theme dropdown in sidebar footer and choose "Dunkel"
    await page.getByRole('button', { name: 'Theme' }).click()
    await page.getByRole('menuitemradio', { name: 'Dunkel' }).click()

    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')

    await page.reload()
    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  })

  test('system mode follows OS preference changes', async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'system')
    })

    await context.grantPermissions([])
    await page.context().addInitScript(() => {
      // ensure no prior theme class sticks around
      document.documentElement.classList.remove('dark')
    })

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/dashboard')

    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)

    await page.emulateMedia({ colorScheme: 'light' })
    // Manually dispatch change event for matchMedia to simulate OS change notification in-page
    await page.evaluate(() => {
      const m = window.matchMedia('(prefers-color-scheme: dark)')
      let ev: any
      try {
        // Some browsers support MediaQueryListEvent constructor
        // @ts-ignore
        ev = new (window as any).MediaQueryListEvent('change', { matches: m.matches, media: m.media })
      } catch {
        ev = new Event('change')
        ;(ev as any).matches = m.matches
        ;(ev as any).media = m.media
      }
      if (typeof (m as any).dispatchEvent === 'function') {
        ;(m as any).dispatchEvent(ev)
      }
    })
    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false)
  })
})
