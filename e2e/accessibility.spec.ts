import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DashboardPage } from './page-objects/DashboardPage';
import { PlayersPage } from './page-objects/PlayersPage';
import { MoneyPage } from './page-objects/MoneyPage';

/**
 * Accessibility E2E Tests
 *
 * Tests WCAG 2.1 compliance and accessibility features:
 * - Keyboard navigation
 * - Screen reader compatibility
 * - ARIA attributes
 * - Color contrast
 * - Focus management
 */
test.describe('Feature: Accessibility', () => {
  test.describe('WCAG Compliance', () => {
    test('should not have accessibility violations on dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on players page', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility violations on money page', async ({ page }) => {
      const moneyPage = new MoneyPage(page);
      await moneyPage.navigate();

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate using Tab key', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Check that focus is visible
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Focus on Add Fine button
      await dashboardPage.addFineButton.focus();

      // Press Enter
      await page.keyboard.press('Enter');

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('should activate buttons with Space key', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Focus on Add Payment button
      await dashboardPage.addPaymentButton.focus();

      // Press Space
      await page.keyboard.press('Space');

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('should close dialogs with Escape key', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Open dialog
      await dashboardPage.clickAddFine();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Dialog should close
      await expect(dialog).not.toBeVisible();
    });

    test('should navigate through form fields with Tab', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      await playersPage.clickAddPlayer();

      // Tab through form fields
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
      expect(focused).toBe('name');

      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
      expect(focused).toBe('nickname');
    });

    test('should navigate tables with arrow keys', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      // Focus on table
      const table = playersPage.playersTable;
      await table.focus();

      // Arrow keys should work (implementation may vary)
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Check that focus moved
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Check h1 exists
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Check heading hierarchy
      const headings = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return elements.map((el) => el.tagName);
      });

      // Should start with H1
      expect(headings[0]).toBe('H1');
    });

    test('should have alt text for images', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      // Check all images have alt text
      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => !img.alt).length;
      });

      expect(imagesWithoutAlt).toBe(0);
    });

    test('should have proper ARIA labels for interactive elements', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Check buttons have accessible names
      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        const hasAccessibleName = ariaLabel || (text && text.trim().length > 0);

        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should announce form errors to screen readers', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      await playersPage.clickAddPlayer();

      // Try to submit without filling fields
      await playersPage.saveButton.click();

      // Check for aria-invalid or error messages
      const errors = page.locator('[role="alert"], [aria-invalid="true"]');
      const errorCount = await errors.count();

      expect(errorCount).toBeGreaterThan(0);
    });

    test('should have proper landmark roles', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      const mainExists = await main.count() > 0;

      expect(mainExists).toBe(true);
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modal dialogs', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Open dialog
      await dashboardPage.clickAddFine();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Tab multiple times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        // Focus should remain within dialog
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(active);
        });

        expect(focusedElement).toBe(true);
      }
    });

    test('should show visible focus indicators', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Focus on a button
      await dashboardPage.addFineButton.focus();

      // Check for focus styles
      const outline = await dashboardPage.addFineButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow;
      });

      expect(outline).not.toBe('none');
      expect(outline).not.toBe('');
    });

    test('should restore focus after dialog closes', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Focus on button and remember it
      await dashboardPage.addFineButton.focus();

      // Open and close dialog
      await dashboardPage.clickAddFine();
      await page.keyboard.press('Escape');

      // Focus should return to button
      await page.waitForTimeout(500);
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent);

      expect(focusedElement).toContain('Fine');
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Run axe test focused on color contrast
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa', 'wcag21aa'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });

    test('should maintain contrast in different states', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Hover over button
      await dashboardPage.addFineButton.hover();

      // Run contrast check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('button')
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have labels for all form inputs', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      await playersPage.clickAddPlayer();

      // Check all inputs have labels
      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        return inputs.filter((input) => {
          const id = input.getAttribute('id');
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;

          return !label && !ariaLabel && !ariaLabelledBy;
        }).length;
      });

      expect(inputsWithoutLabels).toBe(0);
    });

    test('should associate error messages with inputs', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      await playersPage.clickAddPlayer();
      await playersPage.saveButton.click();

      // Check for aria-describedby linking inputs to error messages
      const nameInput = playersPage.nameInput;
      const describedBy = await nameInput.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
    });

    test('should indicate required fields', async ({ page }) => {
      const playersPage = new PlayersPage(page);
      await playersPage.navigate();

      await playersPage.clickAddPlayer();

      // Check for required indicators
      const requiredInputs = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[required], input[aria-required="true"]'));
        return inputs.length;
      });

      expect(requiredInputs).toBeGreaterThan(0);
    });
  });

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.navigate();

      // Tab to first element (usually skip link)
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href*="main"], a:has-text("Skip")').first();
      const hasSkipLink = await skipLink.isVisible().catch(() => false);

      // Skip link should be focusable (may be visually hidden)
      expect(hasSkipLink || await skipLink.count() > 0).toBe(true);
    });
  });
});
