# Performance Testing Guide
**balanceUp Application**

## Quick Start

### Prerequisites
```bash
npm install -g @lhci/cli
npm install --save-dev @playwright/test
```

### Run All Tests
```bash
# Performance tests
npm run test:performance

# Lighthouse CI
npm run lighthouse

# Load tests
npm run test:load
```

---

## Test Scenarios

### 1. Cold Start Test
**Purpose:** Measure first-time load performance

```bash
# Clear cache and test
npm run test:performance -- --grep "Cold Start"
```

**Expected Results:**
- Dashboard load: <2s on 4G
- Firebase init: <500ms
- First Contentful Paint: <2s

### 2. Warm Start Test
**Purpose:** Measure cache effectiveness

```bash
npm run test:performance -- --grep "Warm Start"
```

**Expected Results:**
- Dashboard load: <500ms
- Cache hit rate: >70%
- IndexedDB operational

### 3. Offline Test
**Purpose:** Verify offline functionality

```bash
npm run test:performance -- --grep "Offline"
```

**Expected Results:**
- Cached data accessible
- Write operations queue
- Sync on reconnection

### 4. Large Dataset Test
**Purpose:** Test with 500+ players

```bash
# Seed test data first
npm run seed:test-data

# Run tests
npm run test:performance -- --grep "Large Dataset"
```

**Expected Results:**
- Players page: <2s load
- Scroll performance: >30fps
- Memory usage: <100MB

---

## Lighthouse CI

### Local Run
```bash
lhci autorun
```

### CI/CD Integration
See `.github/workflows/lighthouse.yml`

### Custom Audits
Edit `lighthouserc.js` to add custom assertions

---

## Load Testing

### Basic Load Test
```bash
# Start app
npm run build && npm run start

# Run artillery
npx artillery run artillery-config.yml
```

### Stress Test
```bash
# Ramp up to 200 concurrent users
npx artillery run artillery-stress.yml
```

### Results Analysis
```bash
# Generate HTML report
npx artillery report load-test-results.json \
  --output report.html

# Open report
open report.html
```

---

## Performance Budgets

### Bundle Size
- Total: <750KB gzipped
- Firebase: <130KB gzipped
- Main app: <500KB gzipped

### Timing
- Cold start: <2s (P95)
- Warm start: <500ms (P95)
- Firebase init: <500ms
- Query response (cached): <200ms
- Query response (server): <1s

### Cache
- Hit rate: >70%
- Size: <40MB
- Persistence: Enabled

---

## Troubleshooting

### High Bundle Size
```bash
# Analyze bundle
npm run build
npx webpack-bundle-analyzer .next/analyze/bundle.json
```

### Slow Queries
```bash
# Enable Firestore debug logging
localStorage.debug = 'firestore:*'
```

### Cache Issues
```bash
# Clear IndexedDB
const req = indexedDB.deleteDatabase('firestore');
```

---

## Continuous Monitoring

### Firebase Console
1. Navigate to Performance tab
2. View custom traces
3. Monitor Web Vitals
4. Set up alerts

### Real User Monitoring
Metrics automatically sent to Firebase Analytics:
- First Contentful Paint
- Largest Contentful Paint
- First Input Delay
- Cumulative Layout Shift

---

## Contact

Questions? Contact the Optimizer Agent via Hive Mind system.
