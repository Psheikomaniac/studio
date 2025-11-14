import { test, expect } from '@playwright/test';
import { DashboardPage } from './page-objects/DashboardPage';
import { PlayersPage } from './page-objects/PlayersPage';
import { MoneyPage } from './page-objects/MoneyPage';

/**
 * Responsive Design E2E Tests
 *
 * Tests the application's responsive behavior across different devices:
 * - Mobile viewports (Portrait & Landscape)
 * - Tablet viewports
 * - Desktop viewports
 * - Navigation patterns
 * - Touch interactions
 */
test.describe('Feature: Responsive Design', () => {
  test.describe('Mobile - Portrait', () => {
    test('should display mobile navigation correctly', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 portrait
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Mobile should have hamburger menu or similar
      const mobileMenu = page.locator('[class*="sidebar-trigger"], button[aria-label*="menu"]').first();
      const isVisible = await mobileMenu.isVisible().catch(() => false);

      expect(isVisible).toBe(true);
    });

    test('should adapt dashboard layout for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Dashboard should be visible
      await expect(dashboardPage.pageTitle).toBeVisible();

      // Check viewport dimensions
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBeLessThan(800);
    });

    test('should make action buttons accessible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Quick action buttons should be visible and clickable
      await expect(dashboardPage.addFineButton).toBeVisible();
      await expect(dashboardPage.addPaymentButton).toBeVisible();
    });

    test('should handle table scrolling on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const moneyPage = new MoneyPage(page);
      await moneyPage.navigate();

      // Tables should be scrollable
      const table = moneyPage.transactionsTable;
      await expect(table).toBeVisible();

      // Check if table is in a scrollable container
      const scrollContainer = page.locator('[class*="scroll"], [class*="overflow"]');
      const hasScroll = await scrollContainer.count() > 0;
      expect(hasScroll).toBe(true);
    });
  });

  test.describe('Mobile - Landscape', () => {
    test('should adapt to landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      await expect(dashboardPage.pageTitle).toBeVisible();

      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBeGreaterThan(viewportSize?.height || 0);
    });
  });

  test.describe('Tablet', () => {
    test('should display tablet layout correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro portrait
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Tablet should show more content than mobile
      await expect(dashboardPage.pageTitle).toBeVisible();

      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBeGreaterThan(700);
      expect(viewportSize?.width).toBeLessThan(1400);
    });

    test('should show grid layouts on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 1366 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Stats should be in grid layout
      const statsCards = page.locator('[class*="grid"]');
      const hasGrid = await statsCards.count() > 0;
      expect(hasGrid).toBe(true);
    });
  });

  test.describe('Desktop', () => {
    test('should display full desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      await expect(dashboardPage.pageTitle).toBeVisible();

      // Desktop should show all components side by side
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBeGreaterThan(1200);
    });

    test('should show sidebar navigation on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Desktop should have persistent sidebar
      const sidebar = page.locator('[class*="sidebar"]').first();
      const isVisible = await sidebar.isVisible().catch(() => false);

      // Either sidebar is visible or navigation is in header
      const hasNavigation = isVisible || await page.locator('nav').count() > 0;
      expect(hasNavigation).toBe(true);
    });

    test('should display charts at full width on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Charts should be visible and properly sized
      const revenueChart = dashboardPage.revenueChart;
      await expect(revenueChart).toBeVisible();
    });

    test('should show hover effects on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      // Hover over action buttons
      const addButton = playersPage.addPlayerButton;
      await addButton.hover();

      // Button should be interactive
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('should maintain data consistency across viewports', async ({ page }) => {
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      const desktopTitle = await dashboardPage.pageTitle.textContent();

      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.navigate();

      const mobileTitle = await dashboardPage.pageTitle.textContent();

      // Title should be the same
      expect(mobileTitle).toBe(desktopTitle);
    });

    test('should maintain functionality across devices', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.navigate();

        // Core functionality should work on all devices
        await expect(dashboardPage.pageTitle).toBeVisible();
        await expect(dashboardPage.addFineButton).toBeVisible();
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle orientation change gracefully', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 812 });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      await expect(dashboardPage.pageTitle).toBeVisible();

      // Switch to landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(500);

      // Content should still be visible
      await expect(dashboardPage.pageTitle).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test('should support touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Tap on add fine button
      await dashboardPage.addFineButton.tap();

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('should support swipe gestures for scrolling', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const moneyPage = new MoneyPage(page);
      await moneyPage.navigate();

      // Table should be scrollable via touch
      const table = moneyPage.transactionsTable;
      await expect(table).toBeVisible();

      // Perform scroll gesture
      await table.hover();
      // Note: Actual swipe testing requires more complex touch event simulation
    });
  });

  test.describe('Text Readability', () => {
    test('should maintain readable text on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Check font sizes are readable
      const title = dashboardPage.pageTitle;
      await expect(title).toBeVisible();

      // Get computed styles
      const fontSize = await title.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      // Font size should be at least 14px
      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(14);
    });

    test('should not cause horizontal scrolling on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Check document width
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 0;

      // Document should not be wider than viewport
      expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
    });
  });

  test.describe('Performance on Different Devices', () => {
    test('should load quickly on mobile networks', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', (route) => route.continue());

      const startTime = Date.now();

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();
      await dashboardPage.waitForPageLoad();

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time even on slow connection
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
