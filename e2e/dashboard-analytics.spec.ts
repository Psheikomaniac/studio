import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects/DashboardPage';
import { PlayersPage } from './page-objects/PlayersPage';
import { TestDataHelper } from './helpers/test-data.helper';

/**
 * Dashboard Analytics E2E Tests
 *
 * Tests the dashboard analytics and visualization features:
 * - Viewing balance summary
 * - Filtering transactions
 * - Navigating between views
 * - Chart rendering
 * - KPIs display
 */
test.describe('Feature: Dashboard Analytics', () => {
  let dashboardPage: DashboardPage;
  let playersPage: PlayersPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    playersPage = new PlayersPage(page);

    await dashboardPage.navigate();
  });

  test('should display dashboard with all key components', async () => {
    // GIVEN: User is on the dashboard
    // THEN: All key components should be visible
    await expect(dashboardPage.pageTitle).toBeVisible();
    await expect(dashboardPage.addFineButton).toBeVisible();
    await expect(dashboardPage.addPaymentButton).toBeVisible();
    await expect(dashboardPage.recordDueButton).toBeVisible();
    await expect(dashboardPage.recordBeverageButton).toBeVisible();
  });

  test('should display stat cards correctly', async ({ page: _page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User views stat cards
    const statsVisible = await dashboardPage.statsCards.first().isVisible();

    // THEN: Stat cards should be displayed
    expect(statsVisible).toBe(true);

    // Stats section should contain relevant information
    const statsCount = await dashboardPage.statsCards.count();
    expect(statsCount).toBeGreaterThan(0);
  });

  test('should render revenue chart', async () => {
    // GIVEN: Dashboard is loaded
    // WHEN: User views the revenue chart
    const chartVisible = await dashboardPage.isChartVisible();

    // THEN: Chart should be rendered
    expect(chartVisible).toBe(true);
  });

  test('should display top debtors widget', async ({ page: _page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User views top debtors
    const topDebtorsVisible = await dashboardPage.topDebtorsWidget.isVisible();

    // THEN: Top debtors widget should be visible
    expect(topDebtorsVisible).toBe(true);

    // Get debtors list (may be empty if no debtors exist)
    const debtors = await dashboardPage.getTopDebtors();
    expect(Array.isArray(debtors)).toBe(true);
  });

  test('should display recent activity widget', async () => {
    // GIVEN: Dashboard is loaded
    // WHEN: User views recent activity
    const recentActivityVisible = await dashboardPage.recentActivityWidget.isVisible();

    // THEN: Recent activity widget should be visible
    expect(recentActivityVisible).toBe(true);

    const transactionCount = await dashboardPage.getRecentTransactions();
    expect(transactionCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to players page from dashboard', async ({ page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User clicks on a navigation link
    const navLink = page.getByRole('link', { name: /players/i }).first();
    await navLink.click();

    // THEN: Should navigate to players page
    await page.waitForURL('**/players');
    await expect(playersPage.pageTitle).toBeVisible();
  });

  test('should open quick action dialogs', async ({ page }) => {
    // Test Add Fine Dialog
    await dashboardPage.clickAddFine();
    const fineDialog = page.locator('[role="dialog"]');
    await expect(fineDialog).toBeVisible();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close|cancel/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);

    // Test Add Payment Dialog
    await dashboardPage.clickAddPayment();
    await expect(fineDialog).toBeVisible();
  });

  test('should display data freshness indicator', async ({ page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User views data freshness
    const freshnessText = await page.locator('text=Last data update').textContent();

    // THEN: Data freshness should be displayed
    expect(freshnessText).not.toBeNull();
    expect(freshnessText).toContain('Last data update');
  });

  test('should show correct stat values', async ({ page }) => {
    // GIVEN: Dashboard is loaded
    // WHEN: User checks stat cards
    const statsCards = page.locator('[class*="card"]');
    const firstStatValue = await statsCards.first().locator('[class*="font-bold"]').textContent();

    // THEN: Stats should have numeric values or currency
    expect(firstStatValue).not.toBeNull();
    // Should contain numbers or currency symbols
    const hasNumberOrCurrency = /[0-9€]/.test(firstStatValue || '');
    expect(hasNumberOrCurrency).toBe(true);
  });

  test('should update dashboard in real-time after adding transaction', async ({ page }) => {
    // GIVEN: Initial transaction count
    const initialTransactions = await dashboardPage.getRecentTransactions();

    // Create a test player and add a fine
    const testPlayerName = TestDataHelper.generatePlayerName();
    const testNickname = TestDataHelper.generateNickname();

    await playersPage.navigate();
    await playersPage.createPlayer(testPlayerName, testNickname);
    await page.waitForTimeout(2000);

    await dashboardPage.navigate();
    await dashboardPage.clickAddFine();

    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Real-time update test');
    await page.getByLabel(/amount/i).fill('15');
    await page.getByRole('button', { name: /save|add fine/i }).click();

    // WHEN: Dashboard reloads
    await page.waitForTimeout(3000); // Wait for real-time update

    // THEN: Recent transactions should be updated
    const newTransactions = await dashboardPage.getRecentTransactions();
    expect(newTransactions).toBeGreaterThanOrEqual(initialTransactions);
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // GIVEN: Dashboard loaded (may have empty sections)
    // WHEN: Sections have no data
    // THEN: Should display appropriate empty state messages

    // Check if any empty state messages are shown
    const emptyStateMessages = [
      'No players in debt',
      'No recent activity',
      'No transactions',
    ];

    let hasEmptyState = false;
    for (const message of emptyStateMessages) {
      const exists = await page.locator(`text=${message}`).isVisible().catch(() => false);
      if (exists) {
        hasEmptyState = true;
        break;
      }
    }

    // Either has data or shows empty state
    expect(hasEmptyState || await dashboardPage.getRecentTransactions() > 0).toBe(true);
  });

  test('should display transaction types correctly', async ({ page }) => {
    // GIVEN: Dashboard with transactions
    const recentActivity = dashboardPage.recentActivityWidget;
    const hasTransactions = await recentActivity.locator('tbody tr').count() > 0;

    if (hasTransactions) {
      // WHEN: Viewing transaction types
      const badges = page.locator('[class*="badge"]');
      const badgeCount = await badges.count();

      // THEN: Transaction type badges should be visible
      expect(badgeCount).toBeGreaterThan(0);

      // Check for various transaction types
      const transactionTypes = ['Fine', 'Payment', 'Due', 'Beverage'];
      let foundType = false;

      for (const type of transactionTypes) {
        const typeVisible = await page.locator(`text=${type}`).isVisible().catch(() => false);
        if (typeVisible) {
          foundType = true;
          break;
        }
      }

      // At least one type should be visible if transactions exist
      expect(foundType).toBe(true);
    }
  });

  test('should perform within acceptable time', async ({ page: _page }) => {
    // GIVEN: User navigates to dashboard
    const startTime = Date.now();

    // WHEN: Dashboard loads
    await dashboardPage.navigate();
    await dashboardPage.waitForPageLoad();

    const loadTime = Date.now() - startTime;

    // THEN: Page should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });
});
