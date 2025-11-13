import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects/DashboardPage';
import { PlayersPage } from './page-objects/PlayersPage';
import { MoneyPage } from './page-objects/MoneyPage';
import { TestDataHelper } from './helpers/test-data.helper';

/**
 * Payment Processing E2E Tests
 *
 * Tests the complete payment processing workflow:
 * - Recording cash payments
 * - Applying payments to balance
 * - Verifying balance recalculation
 * - Viewing payment history
 * - Partial payments
 */
test.describe('Feature: Payment Processing', () => {
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

  test('should record a cash payment successfully', async ({ page }) => {
    // GIVEN: User clicks on "Add Payment" button
    await dashboardPage.clickAddPayment();

    // WHEN: User fills in payment details
    const paymentReason = TestDataHelper.generatePaymentReason();
    const paymentAmount = TestDataHelper.generateAmount(10, 100);

    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();

    await page.getByLabel(/reason/i).fill(paymentReason);
    await page.getByLabel(/amount/i).fill(paymentAmount.toString());

    await page.getByRole('button', { name: /save|add payment/i }).click();

    // THEN: Payment should be created
    const toastAppeared = await dashboardPage.waitForToast(/payment added|success/i);
    expect(toastAppeared).toBe(true);

    // AND: Payment should appear in transactions
    await moneyPage.navigate();
    await page.waitForTimeout(2000);

    await moneyPage.searchTransactions(paymentReason);
    await page.waitForTimeout(1000);

    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);
  });

  test('should validate payment form fields', async ({ page }) => {
    // GIVEN: User opens payment dialog
    await dashboardPage.clickAddPayment();

    // WHEN: User tries to save without required fields
    await page.getByRole('button', { name: /save|add payment/i }).click();

    // THEN: Validation errors should be displayed
    const playerError = page.locator('text=/please select.*player/i');
    const reasonError = page.locator('text=/reason.*required/i');
    const amountError = page.locator('text=/amount.*positive/i');

    const hasError = await playerError.isVisible().catch(() => false) ||
                     await reasonError.isVisible().catch(() => false) ||
                     await amountError.isVisible().catch(() => false);

    expect(hasError).toBe(true);
  });

  test('should apply payment to balance correctly', async ({ page }) => {
    // GIVEN: A player with a fine exists
    await dashboardPage.clickAddFine();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Test fine for payment');
    await page.getByLabel(/amount/i).fill('50');
    await page.getByRole('button', { name: /save|add fine/i }).click();
    await page.waitForTimeout(2000);

    // Get initial balance
    await playersPage.navigate();
    const initialBalance = await playersPage.getPlayerBalance(testPlayerName);

    // WHEN: User makes a payment
    await dashboardPage.navigate();
    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben');
    await page.getByLabel(/amount/i).fill('30');
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // THEN: Balance should be updated
    await playersPage.navigate();
    const newBalance = await playersPage.getPlayerBalance(testPlayerName);

    expect(newBalance).not.toBe(initialBalance);
    expect(newBalance).not.toBeNull();
  });

  test('should filter payments by type', async ({ page }) => {
    // GIVEN: A payment exists
    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Filter test payment');
    await page.getByLabel(/amount/i).fill('25');
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // WHEN: User filters by payment type
    await moneyPage.navigate();
    await moneyPage.filterByType('payment');

    // THEN: Only payments should be visible
    await page.waitForTimeout(1000);
    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThan(0);

    // All visible items should have "Payment" badge
    const paymentBadges = page.locator('text=Payment');
    const paymentCount = await paymentBadges.count();
    expect(paymentCount).toBeGreaterThan(0);
  });

  test('should display payment in recent activity', async ({ page }) => {
    // GIVEN: A payment is made
    const paymentReason = 'Recent activity test';

    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill(paymentReason);
    await page.getByLabel(/amount/i).fill('40');
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // WHEN: User views dashboard
    await dashboardPage.navigate();

    // THEN: Payment should appear in recent activity
    const recentTransactions = await dashboardPage.getRecentTransactions();
    expect(recentTransactions).toBeGreaterThan(0);

    const activityText = await dashboardPage.recentActivityWidget.textContent();
    // Recent activity should show some transactions
    expect(activityText).not.toBeNull();
  });

  test('should show revenue KPIs after payment', async ({ page }) => {
    // GIVEN: A payment is made
    const paymentAmount = 50;

    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben');
    await page.getByLabel(/amount/i).fill(paymentAmount.toString());
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // WHEN: User views money page
    await moneyPage.navigate();

    // THEN: Revenue KPIs should be updated
    const revenueTodayValue = await moneyPage.getKPIValue('today');
    const revenue7dValue = await moneyPage.getKPIValue('7d');
    const revenue28dValue = await moneyPage.getKPIValue('28d');

    expect(revenueTodayValue).not.toBeNull();
    expect(revenue7dValue).not.toBeNull();
    expect(revenue28dValue).not.toBeNull();

    // Today's revenue should be at least the payment amount
    const todayAmount = parseFloat(revenueTodayValue!.replace(/[^0-9,.]/g, '').replace(',', '.'));
    expect(todayAmount).toBeGreaterThanOrEqual(paymentAmount);
  });

  test('should create Guthaben and Guthaben Rest payments', async ({ page }) => {
    // GIVEN: User creates Guthaben payment
    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben');
    await page.getByLabel(/amount/i).fill('100');
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // WHEN: User creates Guthaben Rest payment
    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben Rest');
    await page.getByLabel(/amount/i).fill('50');
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // THEN: Both payments should be visible
    await moneyPage.navigate();
    await moneyPage.searchTransactions('Guthaben');
    await page.waitForTimeout(1000);

    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle multiple payments from same player', async ({ page }) => {
    // GIVEN: User makes multiple payments
    const paymentsToCreate = 3;

    for (let i = 0; i < paymentsToCreate; i++) {
      await dashboardPage.navigate();
      await dashboardPage.clickAddPayment();
      await page.getByLabel(/player/i).click();
      await page.getByRole('option', { name: testPlayerName }).click();
      await page.getByLabel(/reason/i).fill(`Payment ${i + 1}`);
      await page.getByLabel(/amount/i).fill('20');
      await page.getByRole('button', { name: /save|add payment/i }).click();
      await page.waitForTimeout(1500);
    }

    // WHEN: User views money page and filters by player
    await moneyPage.navigate();
    await moneyPage.playerFilter.click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await moneyPage.filterByType('payment');

    // THEN: All payments should be visible
    await page.waitForTimeout(1000);
    const transactionCount = await moneyPage.getTransactionCount();
    expect(transactionCount).toBeGreaterThanOrEqual(paymentsToCreate);
  });

  test('should display total credits correctly', async ({ page }) => {
    // GIVEN: Payments are made
    const payment1 = 50;
    const payment2 = 75;

    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben');
    await page.getByLabel(/amount/i).fill(payment1.toString());
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    await dashboardPage.clickAddPayment();
    await page.getByLabel(/player/i).click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await page.getByLabel(/reason/i).fill('Guthaben');
    await page.getByLabel(/amount/i).fill(payment2.toString());
    await page.getByRole('button', { name: /save|add payment/i }).click();
    await page.waitForTimeout(2000);

    // WHEN: User filters to see only this player's payments
    await moneyPage.navigate();
    await moneyPage.playerFilter.click();
    await page.getByRole('option', { name: testPlayerName }).click();
    await moneyPage.filterByType('payment');

    // THEN: Total credits should be sum of payments
    await page.waitForTimeout(1000);
    const totalCreditsText = await page.locator('text=Total Credits').locator('..').locator('[class*="font-bold"]').textContent();

    expect(totalCreditsText).not.toBeNull();
    const totalCredits = parseFloat(totalCreditsText!.replace(/[^0-9,.]/g, '').replace(',', '.'));
    expect(totalCredits).toBeGreaterThanOrEqual(payment1 + payment2);
  });
});
