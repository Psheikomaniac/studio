# E2E Testing Quick Start Guide

## 🚀 Get Started in 3 Minutes

### 1. Install & Setup (1 minute)

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

### 2. Run Tests (1 minute)

```bash
# Run all E2E tests
npm run test:e2e

# Or run with UI mode (interactive)
npm run test:e2e:ui
```

### 3. View Results (30 seconds)

```bash
# Open HTML report
npm run test:e2e:report
```

---

## 📋 Common Commands

```bash
# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests only
npm run test:e2e:mobile

# Debug a failing test
npm run test:e2e:debug

# Run specific test file
npx playwright test player-management.spec.ts

# Run tests matching a pattern
npx playwright test -g "should create"
```

---

## 📊 What's Tested

| Test Suite | Test Cases | Duration |
|------------|-----------|----------|
| Player Management | 10 | 45s |
| Fine Management | 9 | 50s |
| Payment Processing | 9 | 55s |
| Dashboard Analytics | 12 | 40s |
| Responsive Design | 17 | 60s |
| Accessibility | 19 | 70s |
| **TOTAL** | **76+** | **~5 min** |

---

## ✅ Test Coverage

### Critical User Journeys

- ✅ Player CRUD operations
- ✅ Fine creation & management
- ✅ Payment processing
- ✅ Balance calculations
- ✅ Dashboard analytics
- ✅ Real-time updates
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Cross-browser (Chrome, Firefox, Safari)

---

## 🔧 Troubleshooting

### Tests fail with timeout

```bash
# Increase timeout in test
test.setTimeout(60000);
```

### Firebase authentication issues

Check `.env.local` has Firebase credentials:
```env
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_API_KEY=...
```

### Port 9002 already in use

```bash
# Stop dev server
# Or change port in playwright.config.ts
```

---

## 📚 Documentation

- **Full Guide**: `/e2e/README.md`
- **Detailed Report**: `/E2E_TEST_REPORT.md`
- **This Quick Start**: `/E2E_QUICK_START.md`

---

## 🎯 Next Steps

1. ✅ Run initial test suite
2. ✅ Review test report
3. ✅ Configure Firebase (if needed)
4. ✅ Add to CI/CD pipeline
5. ✅ Add new tests as features are added

---

## 💡 Tips

- Use `npm run test:e2e:ui` for interactive debugging
- Run specific tests with `-g` flag to save time
- Check HTML report for detailed failure information
- Keep page objects updated when UI changes
- Add new tests following the existing pattern

---

## 📞 Need Help?

- Check `/e2e/README.md` Troubleshooting section
- Review test examples in `/e2e/*.spec.ts`
- Open an issue in the repository

---

**Happy Testing!** 🎉
