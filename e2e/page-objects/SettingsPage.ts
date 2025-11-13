import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Settings Page Object
 *
 * Represents the settings page with CSV import and data management
 */
export class SettingsPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly fileInput: Locator;
  readonly importButton: Locator;
  readonly importProgress: Locator;
  readonly importResult: Locator;
  readonly resetBalancesButton: Locator;
  readonly deleteAllDataButton: Locator;
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: 'Settings' });
    this.fileInput = page.locator('#import-file');
    this.importButton = page.getByRole('button', { name: /import data/i });
    this.importProgress = page.locator('[role="progressbar"]');
    this.importResult = page.locator('text=/successfully imported|error/i');
    this.resetBalancesButton = page.getByRole('button', { name: /reset all balances/i });
    this.deleteAllDataButton = page.getByRole('button', { name: /delete all data/i });
    this.confirmDialog = page.locator('[role="alertdialog"]');
    this.confirmButton = this.confirmDialog.getByRole('button', { name: /ja|yes/i });
    this.cancelButton = this.confirmDialog.getByRole('button', { name: /abbrechen|cancel/i });
  }

  /**
   * Navigate to settings page
   */
  async navigate(): Promise<void> {
    await this.goto('/settings');
    await this.waitForPageLoad();
  }

  /**
   * Upload CSV file
   */
  async uploadCSV(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Click import button
   */
  async clickImport(): Promise<void> {
    await this.importButton.click();
  }

  /**
   * Import CSV file
   */
  async importCSV(filePath: string): Promise<void> {
    await this.uploadCSV(filePath);
    await this.clickImport();
    // Wait for import to complete
    await this.page.waitForSelector('text=/successfully imported|error/i', { timeout: 60000 });
  }

  /**
   * Get import result message
   */
  async getImportResult(): Promise<string | null> {
    return this.importResult.textContent();
  }

  /**
   * Wait for import progress
   */
  async waitForImportProgress(): Promise<void> {
    await this.importProgress.waitFor({ state: 'visible' });
    await this.importProgress.waitFor({ state: 'hidden', timeout: 60000 });
  }

  /**
   * Reset all balances
   */
  async resetBalances(): Promise<void> {
    await this.resetBalancesButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });
    await this.confirmButton.click();
    await this.confirmDialog.waitFor({ state: 'hidden', timeout: 30000 });
  }

  /**
   * Delete all data
   */
  async deleteAllData(): Promise<void> {
    await this.deleteAllDataButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });
    await this.confirmButton.click();
    await this.confirmDialog.waitFor({ state: 'hidden', timeout: 60000 });
  }

  /**
   * Get data quality metric
   */
  async getDataQualityMetric(metricName: string): Promise<string | null> {
    const metric = this.page.locator(`text=${metricName}`).locator('..').locator('[class*="font-bold"]');
    return metric.textContent();
  }
}
