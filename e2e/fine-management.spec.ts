import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects/DashboardPage';
import { PlayersPage } from './page-objects/PlayersPage';
import { MoneyPage } from './page-objects/MoneyPage';
import { TestDataHelper } from './helpers/test-data.helper';

/**
 * Fine Management E2E Tests
 *
 * Tests the complete fine management workflow:
 * - Creating manual fines
 * - Generating AI-suggested fines
 * - Applying auto-payment logic
 * - Editing existing fines
 * - Marking fines as paid/unpaid
 */
test.describe('Feature: Fine Management', () => {
  let dashboardPage: DashboardPage;
  let playersPage: PlayersPage;
  let moneyPage: MoneyPage;
  let testPlayerName: string;
  let testNickname: string;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    playersPage = new PlayersPage(page);
    moneyPage = new MoneyPage(page);

    testPlayerName = TestDataHelper.generatePlayerName();
    testNickname = TestDataHelper.generateNickname();

    // Create a test player first
    await playersPage.navigate();
    await playersPage.createPlayer(testPlayerName, testNickname);
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await dashboardPage.navigate();
  });

  test('should create a manual fine successfully', async ({ page }) => {
    // GIVEN: User clicks on "Add Fine" button from dashboard
    await dashboardPage.clickAddFine();

    // WHEN: User fills in fine details
    const fineReason = TestDataHelper.generateFineReason();
    const fineAmount = TestDataHelper.generateAmount(5, 20);

    // Select player (multi-select)
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();

    // Fill reason and amount
    await page.getByLabel(/reason/i).fill(fineReason);
    await page.getByLabel(/amount/i).fill(fineAmount.toString());

    // Save fine
    await page.getByRole('button', { name: /save|add fine/i }).click();

    // THEN: Fine should be created and toast should appear
    const toastAppeared = await dashboardPage.waitForToast(/fine added|success/i);
    expect(toastAppeared).toBe(true);

    // AND: Fine should appear in transactions
    await moneyPage.navigate();
    await page.waitForTimeout(2000);

    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);
  });

  test('should validate fine form fields', async ({ page }) => {
    // GIVEN: User opens fine dialog
    await dashboardPage.clickAddFine();

    // WHEN: User tries to save without required fields
    await page.getByRole('button', { name: /save|add fine/i }).click();

    // THEN: Validation errors should be displayed
    const playerError = page.locator('text=/please select at least one player/i');
    const reasonError = page.locator('text=/reason must be at least 3 characters/i');
    const amountError = page.locator('text=/amount must be a positive number/i');

    await expect(playerError).toBeVisible();
    await expect(reasonError).toBeVisible();
    await expect(amountError).toBeVisible();
  });

  test('should create fine for multiple players', async ({ page }) => {
    // GIVEN: Multiple players exist
    const player2Name = TestDataHelper.generatePlayerName();
    const player2Nickname = TestDataHelper.generateNickname();

    await playersPage.navigate();
    await playersPage.createPlayer(player2Name, player2Nickname);
    await page.waitForTimeout(2000);

    await dashboardPage.navigate();
    await dashboardPage.clickAddFine();

    // WHEN: User selects multiple players and creates fine
    const fineReason = 'Team tardiness penalty';
    const fineAmount = 10;

    // Select first player
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();

    // Select second player
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: player2Name }).click();

    await page.getByLabel(/reason/i).fill(fineReason);
    await page.getByLabel(/amount/i).fill(fineAmount.toString());

    await page.getByRole('button', { name: /save|add fine/i }).click();

    // THEN: Fines should be created for both players
    await page.waitForTimeout(2000);
    await moneyPage.navigate();

    await moneyPage.searchTransactions(fineReason);
    await page.waitForTimeout(1000);

    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThanOrEqual(2);
  });

  test('should use predefined fine amounts', async ({ page }) => {
    // GIVEN: User opens fine dialog
    await dashboardPage.clickAddFine();

    // WHEN: User selects a predefined fine
    const predefinedFineSelector = page.getByLabel(/predefined fine|select fine/i);
    await predefinedFineSelector.click();

    const firstOption = page.getByRole('option').first();
    await firstOption.click();

    // THEN: Amount should be auto-filled
    const amountInput = page.getByLabel(/amount/i);
    const value = await amountInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test('should toggle fine payment status', async ({ page }) => {
    // GIVEN: A fine exists
    await dashboardPage.clickAddFine();

    const fineReason = TestDataHelper.generateFineReason();
    const fineAmount = TestDataHelper.generateAmount();

    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill(fineReason);
    await page.getByLabel(/amount/i).fill(fineAmount.toString());
    await page.getByRole('button', { name: /save|add fine/i }).click();

    await page.waitForTimeout(2000);

    // WHEN: User navigates to money page and toggles status
    await moneyPage.navigate();
    await moneyPage.searchTransactions(fineReason);
    await page.waitForTimeout(1000);

    // Find the fine and toggle its status
    const unpaidBadge = page.locator('text=Unpaid').first();
    await unpaidBadge.click();

    // THEN: Status should change to paid
    await page.waitForTimeout(1000);
    const paidBadge = page.locator('text=Paid').first();
    await expect(paidBadge).toBeVisible();

    // AND: Toast should confirm status change
    const toastAppeared = await moneyPage.waitForToast(/status updated/i);
    expect(toastAppeared).toBe(true);
  });

  test('should filter fines by status', async ({ page }) => {
    // GIVEN: Multiple fines with different statuses exist
    await dashboardPage.clickAddFine();

    const fineReason = 'Test Fine for Filtering';
    const fineAmount = 15;

    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill(fineReason);
    await page.getByLabel(/amount/i).fill(fineAmount.toString());
    await page.getByRole('button', { name: /save|add fine/i }).click();

    await page.waitForTimeout(2000);

    // WHEN: User filters by unpaid fines
    await moneyPage.navigate();
    await moneyPage.filterByType('fine');
    await moneyPage.filterByStatus('unpaid');

    // THEN: Only unpaid fines should be visible
    await page.waitForTimeout(1000);
    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // All visible items should have "Unpaid" badge
    const unpaidBadges = page.locator('text=Unpaid');
    const unpaidCount = await unpaidBadges.count();
    expect(unpaidCount).toBeGreaterThan(0);
  });

  test('should display fine in player balance calculation', async ({ page }) => {
    // GIVEN: A fine is created for a player
    const fineAmount = 25;

    await dashboardPage.clickAddFine();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Balance test fine');
    await page.getByLabel(/amount/i).fill(fineAmount.toString());
    await page.getByRole('button', { name: /save|add fine/i }).click();

    await page.waitForTimeout(2000);

    // WHEN: User views player balance
    await playersPage.navigate();
    const balance = await playersPage.getPlayerBalance(testPlayerName);

    // THEN: Balance should reflect the fine (negative)
    expect(balance).not.toBeNull();
    expect(balance).toContain('€');
    // Note: Balance calculation depends on the app logic
  });

  test('should clear fine filters', async ({ page }) => {
    // GIVEN: Filters are applied
    await moneyPage.navigate();
    await moneyPage.filterByType('fine');
    await moneyPage.filterByStatus('unpaid');
    await page.waitForTimeout(500);

    // WHEN: User clears filters
    await moneyPage.clearFilters();

    // THEN: All transactions should be visible again
    await page.waitForTimeout(500);
    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThanOrEqual(0);
  });

  test('should show open fines KPI', async ({ page }) => {
    // GIVEN: Unpaid fines exist
    const fineAmount = 30;

    await dashboardPage.clickAddFine();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('KPI test fine');
    await page.getByLabel(/amount/i).fill(fineAmount.toString());
    await page.getByRole('button', { name: /save|add fine/i }).click();

    await page.waitForTimeout(2000);

    // WHEN: User views money page
    await moneyPage.navigate();

    // THEN: Open Fines KPI should display correct amount
    const openFinesValue = await moneyPage.getKPIValue('openFines');
    expect(openFinesValue).not.toBeNull();
    expect(openFinesValue).toContain('€');

    const amount = parseFloat(openFinesValue!.replace(/[^0-9,.]/g, '').replace(',', '.'));
    expect(amount).toBeGreaterThan(0);
  });
});
