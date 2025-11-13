import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Money Page Object
 *
 * Represents the money/transactions page with filtering capabilities
 */
export class MoneyPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly addFineButton: Locator;
  readonly addPaymentButton: Locator;
  readonly recordDueButton: Locator;
  readonly recordBeverageButton: Locator;
  readonly searchInput: Locator;
  readonly typeFilter: Locator;
  readonly playerFilter: Locator;
  readonly statusFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly transactionsTable: Locator;
  readonly paginationInfo: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;

  // KPI locators
  readonly revenueTodayCard: Locator;
  readonly revenue7dCard: Locator;
  readonly revenue28dCard: Locator;
  readonly openFinesCard: Locator;
  readonly arppuCard: Locator;

  // Dialog locators
  readonly fineDialog: Locator;
  readonly paymentDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Money' });
    this.addFineButton = page.getByRole('button', { name: /add fine/i }).first();
    this.addPaymentButton = page.getByRole('button', { name: /add payment/i }).first();
    this.recordDueButton = page.getByRole('button', { name: /record due/i }).first();
    this.recordBeverageButton = page.getByRole('button', { name: /record beverage/i }).first();
    this.searchInput = page.getByPlaceholder(/search player or description/i);
    this.typeFilter = page.locator('[aria-label="Type filter"]').first();
    this.playerFilter = page.locator('[aria-label="Player filter"]').first();
    this.statusFilter = page.locator('[aria-label="Status filter"]').first();
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters/i });
    this.transactionsTable = page.locator('table').last();
    this.paginationInfo = page.locator('text=/showing \\d+ - \\d+ of \\d+/i');
    this.prevPageButton = page.getByRole('button', { name: /prev/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });

    // KPI cards
    this.revenueTodayCard = page.locator('text=Revenue Today').locator('..');
    this.revenue7dCard = page.locator('text=Revenue 7d').locator('..');
    this.revenue28dCard = page.locator('text=Revenue 28d').locator('..');
    this.openFinesCard = page.locator('text=Open Fines').locator('..');
    this.arppuCard = page.locator('text=ARPPU').locator('..');

    // Dialogs
    this.fineDialog = page.locator('[role="dialog"]').filter({ hasText: /add fine/i });
    this.paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /add payment/i });
  }

  /**
   * Navigate to money page
   */
  async navigate(): Promise<void> {
    await this.goto('/money');
    await this.waitForPageLoad();
  }

  /**
   * Search for transactions
   */
  async searchTransactions(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  /**
   * Filter by type
   */
  async filterByType(type: 'all' | 'fine' | 'payment' | 'due' | 'beverage'): Promise<void> {
    await this.typeFilter.click();
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'all' | 'paid' | 'unpaid' | 'exempt'): Promise<void> {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    const isVisible = await this.clearFiltersButton.isVisible().catch(() => false);
    if (isVisible) {
      await this.clearFiltersButton.click();
    }
  }

  /**
   * Get transaction count
   */
  async getTransactionCount(): Promise<number> {
    return this.transactionsTable.locator('tbody tr').count();
  }

  /**
   * Get KPI value
   */
  async getKPIValue(kpiName: 'today' | '7d' | '28d' | 'openFines' | 'arppu'): Promise<string | null> {
    let card: Locator;
    switch (kpiName) {
      case 'today':
        card = this.revenueTodayCard;
        break;
      case '7d':
        card = this.revenue7dCard;
        break;
      case '28d':
        card = this.revenue28dCard;
        break;
      case 'openFines':
        card = this.openFinesCard;
        break;
      case 'arppu':
        card = this.arppuCard;
        break;
    }
    return card.locator('[class*="font-bold"]').first().textContent();
  }

  /**
   * Toggle transaction status (paid/unpaid)
   */
  async toggleTransactionStatus(transactionDescription: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${transactionDescription}")`);
    const statusBadge = row.locator('[class*="badge"]').last();
    await statusBadge.click();
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go to previous page
   */
  async prevPage(): Promise<void> {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get pagination info
   */
  async getPaginationInfo(): Promise<string | null> {
    return this.paginationInfo.textContent();
  }

  /**
   * Click Add Fine
   */
  async clickAddFine(): Promise<void> {
    await this.addFineButton.click();
    await this.fineDialog.waitFor({ state: 'visible' });
  }

  /**
   * Click Add Payment
   */
  async clickAddPayment(): Promise<void> {
    await this.addPaymentButton.click();
    await this.paymentDialog.waitFor({ state: 'visible' });
  }
}
