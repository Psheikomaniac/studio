import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object
 *
 * Represents the main dashboard page with stats, charts, and quick actions
 */
export class DashboardPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly addFineButton: Locator;
  readonly addPaymentButton: Locator;
  readonly recordDueButton: Locator;
  readonly recordBeverageButton: Locator;
  readonly statsCards: Locator;
  readonly revenueChart: Locator;
  readonly topDebtorsWidget: Locator;
  readonly recentActivityWidget: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Dashboard' });
    this.addFineButton = page.getByRole('button', { name: /add fine/i });
    this.addPaymentButton = page.getByRole('button', { name: /add payment/i });
    this.recordDueButton = page.getByRole('button', { name: /record due/i });
    this.recordBeverageButton = page.getByRole('button', { name: /record beverage/i });
    this.statsCards = page.locator('[class*="card"]').filter({ hasText: /total balance|total players/i });
    this.revenueChart = page.locator('text=Revenue by Day');
    this.topDebtorsWidget = page.locator('text=Top Debtors');
    this.recentActivityWidget = page.locator('text=Recent Activity');
  }

  /**
   * Navigate to dashboard
   */
  async navigate(): Promise<void> {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Check if dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    return this.pageTitle.isVisible();
  }

  /**
   * Get stat card value by title
   */
  async getStatValue(title: string): Promise<string | null> {
    const statCard = this.page.locator(`text=${title}`).locator('..').locator('..').locator('[class*="font-bold"]');
    return statCard.textContent();
  }

  /**
   * Click Add Fine button
   */
  async clickAddFine(): Promise<void> {
    await this.addFineButton.click();
  }

  /**
   * Click Add Payment button
   */
  async clickAddPayment(): Promise<void> {
    await this.addPaymentButton.click();
  }

  /**
   * Click Record Due button
   */
  async clickRecordDue(): Promise<void> {
    await this.recordDueButton.click();
  }

  /**
   * Click Record Beverage button
   */
  async clickRecordBeverage(): Promise<void> {
    await this.recordBeverageButton.click();
  }

  /**
   * Get top debtors list
   */
  async getTopDebtors(): Promise<string[]> {
    const debtorElements = await this.page
      .locator('text=Top Debtors')
      .locator('..')
      .locator('..')
      .locator('a')
      .all();

    return Promise.all(debtorElements.map((el) => el.textContent() || ''));
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(): Promise<number> {
    const transactions = await this.page
      .locator('text=Recent Activity')
      .locator('..')
      .locator('..')
      .locator('tbody tr')
      .count();

    return transactions;
  }

  /**
   * Check if chart is visible
   */
  async isChartVisible(): Promise<boolean> {
    return this.revenueChart.isVisible();
  }
}
