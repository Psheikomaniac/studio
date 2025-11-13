import { test as base, Page } from '@playwright/test';

/**
 * Authentication fixture for Firebase
 *
 * This fixture handles Firebase authentication for E2E tests.
 * Since the app uses Firebase, we need to mock/stub authentication or
 * use a test Firebase project.
 *
 * For now, we'll provide helpers to authenticate if needed.
 */

export type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');

    // Check if we're on the login page
    const isLoginPage = await page.locator('h1:has-text("Login")').isVisible().catch(() => false);

    if (isLoginPage) {
      // For E2E tests, we can either:
      // 1. Use Firebase Emulator for testing
      // 2. Mock Firebase auth
      // 3. Use test credentials

      // Option: Wait for manual login in development
      // In production, this should be automated with test credentials
      console.log('Login required. Please authenticate manually or configure Firebase test credentials.');

      // Wait for navigation to dashboard (indicates successful login)
      await page.waitForURL('**/dashboard', { timeout: 60000 });
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
