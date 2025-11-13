import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object
 *
 * Contains common functionality shared across all pages
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Wait for page to be loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Get toast notification text
   */
  async getToastText(): Promise<string | null> {
    const toast = this.page.locator('[role="status"]').first();
    const isVisible = await toast.isVisible().catch(() => false);
    return isVisible ? await toast.textContent() : null;
  }

  /**
   * Wait for toast to appear with specific text
   */
  async waitForToast(text: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(`[role="status"]:has-text("${text}")`, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click a button by text
   */
  async clickButtonByText(text: string): Promise<void> {
    await this.page.getByRole('button', { name: text }).click();
  }

  /**
   * Fill an input by label
   */
  async fillInputByLabel(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible().catch(() => false);
  }

  /**
   * Get element text
   */
  async getText(selector: string): Promise<string | null> {
    const element = this.page.locator(selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    return isVisible ? await element.textContent() : null;
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout, state: 'visible' });
  }
}
