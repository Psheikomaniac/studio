# E2E Testing Suite for BalanceUp Application

Comprehensive End-to-End testing suite built with Playwright for the BalanceUp team finance management application.

## Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Page Object Models](#page-object-models)
- [Writing New Tests](#writing-new-tests)
- [CI/CD Integration](#cicd-integration)
- [Performance Benchmarks](#performance-benchmarks)
- [Accessibility Testing](#accessibility-testing)
- [Troubleshooting](#troubleshooting)

## Overview

This E2E testing suite validates critical user workflows across all major browsers and devices, ensuring the BalanceUp application provides a consistent, accessible, and performant experience for team treasurers managing player finances.

### Technology Stack

- **Test Framework**: Playwright v1.56+
- **Language**: TypeScript
- **Accessibility**: Axe-core
- **Browsers**: Chromium, Firefox, WebKit
- **Devices**: Desktop, Tablet, Mobile (Portrait & Landscape)

### Test Philosophy

- **User-Centric**: Tests simulate real user journeys
- **Cross-Browser**: All tests run on 3+ browsers
- **Responsive**: Mobile-first testing approach
- **Accessible**: WCAG 2.1 compliance validation
- **Fast**: Optimized for quick feedback (< 5 min full suite)

## Test Coverage

### Critical User Journeys

#### 1. Player Management (`player-management.spec.ts`)
- Create new players with validation
- Edit player details
- View player balance and transactions
- Archive/activate players
- Delete players
- Navigate to player detail pages

**Coverage**: 10 test cases
**Estimated Duration**: 45 seconds

#### 2. Fine Management (`fine-management.spec.ts`)
- Create manual fines
- Generate AI-suggested fines
- Apply fines to multiple players
- Use predefined fine amounts
- Toggle payment status
- Filter fines by status
- View fine impact on player balance

**Coverage**: 9 test cases
**Estimated Duration**: 50 seconds

#### 3. Payment Processing (`payment-processing.spec.ts`)
- Record cash payments
- Apply payments to balance
- Verify balance recalculation
- View payment history
- Handle Guthaben and Guthaben Rest
- Track revenue KPIs
- Multiple payments per player

**Coverage**: 9 test cases
**Estimated Duration**: 55 seconds

#### 4. Dashboard Analytics (`dashboard-analytics.spec.ts`)
- View balance summary
- Display stat cards and KPIs
- Render charts and graphs
- Show top debtors
- Display recent activity
- Navigate between views
- Real-time updates
- Performance benchmarks

**Coverage**: 12 test cases
**Estimated Duration**: 40 seconds

#### 5. Responsive Design (`responsive-design.spec.ts`)
- Mobile viewport (Portrait & Landscape)
- Tablet viewport
- Desktop viewport
- Navigation patterns
- Touch interactions
- Cross-device consistency
- Orientation changes
- Text readability

**Coverage**: 17 test cases
**Estimated Duration**: 60 seconds

#### 6. Accessibility (`accessibility.spec.ts`)
- WCAG 2.1 AA compliance
- Keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
- Screen reader compatibility
- ARIA attributes
- Focus management
- Color contrast
- Form accessibility
- Skip links

**Coverage**: 19 test cases
**Estimated Duration**: 70 seconds

### Total Coverage

- **Total Test Cases**: 76+
- **Total Duration**: ~5 minutes (parallel execution)
- **Browsers Tested**: Chromium, Firefox, WebKit
- **Viewports Tested**: Desktop (1920x1080), Tablet (iPad Pro), Mobile (iPhone 12)

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase configuration (for authentication tests)

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**:
   ```bash
   npm run test:e2e:install
   # or
   npx playwright install --with-deps
   ```

3. **Environment Setup**:
   Create `.env.local` with Firebase credentials:
   ```env
   NEXT_PUBLIC_USE_FIREBASE=true
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   # ... other Firebase config
   ```

4. **Verify Installation**:
   ```bash
   npx playwright --version
   ```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug
```

### Browser-Specific Tests

```bash
# Run on Chromium only
npm run test:e2e:chromium

# Run on Firefox only
npm run test:e2e:firefox

# Run on WebKit only
npm run test:e2e:webkit

# Run on mobile devices only
npm run test:e2e:mobile
```

### Specific Test Files

```bash
# Run specific test file
npx playwright test player-management.spec.ts

# Run specific test by name
npx playwright test -g "should create a new player"

# Run tests in specific folder
npx playwright test e2e/
```

### View Test Reports

```bash
# Open HTML test report
npm run test:e2e:report

# Generate JSON report
npx playwright test --reporter=json
```

## Test Structure

```
e2e/
├── fixtures/
│   └── auth.fixture.ts          # Authentication helpers
├── helpers/
│   └── test-data.helper.ts      # Test data generation
├── page-objects/
│   ├── BasePage.ts              # Base page with common methods
│   ├── DashboardPage.ts         # Dashboard page object
│   ├── PlayersPage.ts           # Players page object
│   ├── MoneyPage.ts             # Money/transactions page object
│   └── SettingsPage.ts          # Settings page object
├── test-data/
│   └── (CSV fixtures for import tests)
├── player-management.spec.ts     # Player CRUD tests
├── fine-management.spec.ts       # Fine creation & management
├── payment-processing.spec.ts    # Payment workflows
├── dashboard-analytics.spec.ts   # Dashboard & analytics
├── responsive-design.spec.ts     # Cross-device tests
├── accessibility.spec.ts         # A11y compliance tests
└── README.md                     # This file
```

## Page Object Models

### BasePage

Core functionality shared across all pages:

```typescript
class BasePage {
  goto(path: string)
  waitForPageLoad()
  getToastText()
  waitForToast(text: string)
  clickButtonByText(text: string)
  fillInputByLabel(label: string, value: string)
  // ... more methods
}
```

### DashboardPage

Dashboard-specific actions:

```typescript
class DashboardPage extends BasePage {
  clickAddFine()
  clickAddPayment()
  getStatValue(title: string)
  getTopDebtors()
  getRecentTransactions()
  // ... more methods
}
```

### PlayersPage

Player management actions:

```typescript
class PlayersPage extends BasePage {
  createPlayer(name, nickname, photoUrl?)
  editPlayer(playerName)
  deletePlayer(playerName)
  getPlayerBalance(playerName)
  setPlayerActive(playerName, active)
  // ... more methods
}
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { YourPage } from './page-objects/YourPage';
import { TestDataHelper } from './helpers/test-data.helper';

test.describe('Feature: Your Feature', () => {
  let yourPage: YourPage;

  test.beforeEach(async ({ page }) => {
    yourPage = new YourPage(page);
    await yourPage.navigate();
  });

  test('should perform expected behavior', async () => {
    // GIVEN: Setup state
    const testData = TestDataHelper.generateData();

    // WHEN: Perform action
    await yourPage.performAction(testData);

    // THEN: Verify outcome
    await expect(yourPage.result).toBeVisible();
  });
});
```

### Best Practices

1. **Use Page Objects**: Never interact with selectors directly in tests
2. **Given-When-Then**: Structure tests with clear arrange/act/assert
3. **Unique Test Data**: Use `TestDataHelper` to generate unique data
4. **Wait for Real-time Updates**: Use appropriate timeouts for Firestore updates
5. **Clean Up**: Consider data cleanup in `afterEach` if needed
6. **Descriptive Names**: Test names should describe behavior, not implementation

### Selectors Best Practices

Priority order for selectors:

1. User-facing attributes: `getByRole`, `getByLabel`, `getByPlaceholder`
2. Test IDs: `data-testid` (when semantic selectors aren't available)
3. CSS selectors: Last resort

```typescript
// Good
await page.getByRole('button', { name: /add player/i });
await page.getByLabel('Full Name');

// Avoid
await page.locator('.btn-primary');
```

## CI/CD Integration

### GitHub Actions

Example workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

Set in CI:

```env
PLAYWRIGHT_BASE_URL=http://localhost:9002
CI=true
```

## Performance Benchmarks

### Target Metrics

- **Page Load Time**: < 2 seconds
- **Real-time Updates**: < 500ms after action
- **Test Execution**: < 5 minutes for full suite
- **Individual Test**: < 10 seconds average

### Performance Tests

Performance validations are included in `dashboard-analytics.spec.ts`:

```typescript
test('should perform within acceptable time', async ({ page }) => {
  const startTime = Date.now();
  await dashboardPage.navigate();
  await dashboardPage.waitForPageLoad();
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(2000);
});
```

### Core Web Vitals

(Future enhancement with Lighthouse CI)

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

## Accessibility Testing

### WCAG 2.1 AA Compliance

All pages are tested against WCAG 2.1 Level AA standards using Axe-core:

```typescript
test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Keyboard Navigation

All interactive elements must be accessible via keyboard:

- `Tab`: Navigate forward
- `Shift+Tab`: Navigate backward
- `Enter` / `Space`: Activate buttons
- `Escape`: Close dialogs
- `Arrow Keys`: Navigate lists/tables

### Screen Reader Testing

Tests verify:

- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for all images
- ARIA labels for interactive elements
- Form error announcements
- Landmark roles (main, nav, aside)

## Troubleshooting

### Common Issues

#### Tests Timeout

**Problem**: Tests fail with timeout errors

**Solution**:
- Increase timeout in `playwright.config.ts`
- Check if Firebase is properly configured
- Ensure dev server is running on port 9002

```typescript
// In test file
test.setTimeout(60000); // 60 seconds
```

#### Authentication Failures

**Problem**: Tests fail at login

**Solution**:
- Verify Firebase configuration in `.env.local`
- Use Firebase Emulator for testing
- Check auth fixture implementation

#### Flaky Tests

**Problem**: Tests pass/fail intermittently

**Solution**:
- Add explicit waits for real-time updates
- Use `waitForLoadState('networkidle')`
- Increase polling intervals

```typescript
await page.waitForTimeout(2000); // Wait for Firestore update
```

#### Selector Not Found

**Problem**: Element not found errors

**Solution**:
- Verify element exists in current app version
- Check if element is visible (not hidden)
- Use more resilient selectors

```typescript
// Wait for element before interacting
await page.waitForSelector('button:has-text("Add Player")');
```

### Debug Mode

Run tests in debug mode to step through:

```bash
npm run test:e2e:debug

# Or debug specific test
npx playwright test --debug player-management.spec.ts
```

### Trace Viewer

View recorded traces:

```bash
npx playwright show-trace trace.zip
```

### Verbose Logging

Enable detailed logs:

```bash
DEBUG=pw:api npx playwright test
```

## Contributing

### Adding New Tests

1. Create test file in `e2e/` directory
2. Import required page objects
3. Follow existing test structure
4. Add to CI workflow if needed

### Updating Page Objects

1. Modify page object in `page-objects/`
2. Update dependent tests
3. Run affected tests
4. Update documentation

### Review Checklist

- [ ] Tests follow Given-When-Then structure
- [ ] Uses page objects (no direct selectors in tests)
- [ ] Includes proper assertions
- [ ] Handles async operations correctly
- [ ] Cleans up test data if needed
- [ ] Passes on all browsers
- [ ] Documentation updated

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Axe-core Documentation](https://github.com/dequelabs/axe-core)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

## License

MIT

---

**Last Updated**: November 2025
**Maintained By**: Development Team
**Questions**: Open an issue in the repository
