# Bundle Size Optimization Guide

Complete guide for reducing JavaScript bundle size in balanceUp.

---

## 🎯 Current Optimizations

### 1. Package Import Optimization

**Configuration** in `next.config.ts`:

```typescript
experimental: {
  optimizePackageImports: [
    '@radix-ui/react-icons',
    'lucide-react',
    '@radix-ui/react-dialog',
    // ... more packages
  ],
}
```

**What it does:**
- Tree-shaking for icon libraries
- Only bundles used icons
- Reduces bundle by ~50% for icon packages

**Before:**
```typescript
import * as Icons from 'lucide-react'; // ❌ Imports ALL icons (~500 KB)
```

**After:**
```typescript
import { User, Settings, LogOut } from 'lucide-react'; // ✅ Only these icons
```

### 2. Dynamic Imports

**Utility:** `src/lib/dynamic-imports.ts`

```typescript
import { DynamicCharts, DynamicAdminPanel } from '@/lib/dynamic-imports';

// Heavy component is lazy-loaded
<DynamicCharts data={chartData} />
```

**Benefits:**
- Splits code into separate chunks
- Loads only when needed
- Improves initial page load

**Available Dynamic Imports:**
- `DynamicCharts` - Chart libraries
- `DynamicAdminPanel` - Admin UI
- `DynamicPDFExport` - PDF generation
- `DynamicEditor` - Rich text editor
- `DynamicDataTable` - Heavy tables

### 3. Console Removal

**Production only:**
```typescript
compiler: {
  removeConsole: {
    exclude: ['error', 'warn'], // Keep errors/warnings
  },
}
```

**Savings:** ~5-10 KB depending on console usage

### 4. Compression

**Enabled automatically:**
```typescript
compress: true,
```

**Savings:** ~70% file size via gzip

### 5. Source Maps

**Disabled in production:**
```typescript
productionBrowserSourceMaps: false,
```

**Savings:** ~30% deployment size

---

## 📦 Bundle Analysis

### Run Bundle Analyzer

```bash
# Set environment variable
ANALYZE=true npm run build

# Opens browser with bundle visualization
```

**Look for:**
- 🔴 Large chunks (>200 KB)
- 🔴 Duplicate dependencies
- 🔴 Unused code

### Analyze Script

Add to `package.json`:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:server": "BUNDLE_ANALYZE=server npm run build",
    "analyze:browser": "BUNDLE_ANALYZE=browser npm run build"
  }
}
```

---

## 🎨 Image Optimization

### 1. Use Next.js Image Component

**Always use:**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  loading="lazy"
  placeholder="blur"
/>
```

**Benefits:**
- Automatic WebP conversion
- Lazy loading
- Responsive images
- Blur placeholder

### 2. Optimize Image Sources

**Tools:**
- [TinyPNG](https://tinypng.com/) - PNG/JPG compression
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG optimization
- [Squoosh](https://squoosh.app/) - Modern formats

**Targets:**
- PNG/JPG: <100 KB
- Icons: Use SVG or icon font
- Thumbnails: <20 KB

---

## 📚 Dependency Optimization

### 1. Audit Dependencies

```bash
# Check bundle impact
npm ls --depth=0 --long

# Find unused dependencies
npx depcheck

# Check for duplicates
npm dedupe
```

### 2. Replace Heavy Dependencies

| Heavy | Lighter Alternative | Savings |
|-------|---------------------|---------|
| `moment` (67 KB) | `date-fns` (13 KB) | 80% |
| `lodash` (71 KB) | `lodash-es` (24 KB) | 66% |
| `axios` (13 KB) | `fetch` (native) | 100% |

**Example:**
```typescript
// ❌ Heavy
import moment from 'moment';
const date = moment().format('YYYY-MM-DD');

// ✅ Light
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd');

// ✅ Native
const date = new Date().toISOString().split('T')[0];
```

### 3. Use ES Modules

```typescript
// ❌ CommonJS (can't tree-shake)
const _ = require('lodash');

// ✅ ES Modules (tree-shakeable)
import { debounce } from 'lodash-es';
```

---

## 🚀 Advanced Optimizations

### 1. Route-Based Code Splitting

**Automatic in Next.js:**
- Each page is a separate chunk
- Shared code in common chunk

**Optimize further:**
```typescript
// Lazy load heavy routes
const AdminPage = dynamic(() => import('@/app/admin/page'));
```

### 2. Prefetching

**On hover/interaction:**
```typescript
import { prefetchComponent } from '@/lib/dynamic-imports';

<Link 
  href="/admin"
  {...prefetchComponent(() => import('@/app/admin/page'))}
>
  Admin
</Link>
```

**What it does:**
- Starts loading on hover
- Ready when user clicks
- Feels instant

### 3. Web Workers

**For heavy computations:**
```typescript
// worker.ts
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// component.tsx
const worker = new Worker(new URL('./worker.ts', import.meta.url));
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

**Benefits:**
- Doesn't block main thread
- Better UX for heavy tasks

---

## 📊 Performance Targets

### Bundle Sizes

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Load JS | <100 KB | TBD | 🔄 |
| Total JS (gzip) | <200 KB | TBD | 🔄 |
| Images | <500 KB | TBD | 🔄 |
| Fonts | <100 KB | TBD | 🔄 |

### Lighthouse Scores

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Performance | 90+ | TBD | 🔄 |
| Accessibility | 90+ | TBD | 🔄 |
| Best Practices | 90+ | TBD | 🔄 |
| SEO | 90+ | TBD | 🔄 |

---

## 🔍 Monitoring

### Lighthouse CI

**Add to CI/CD:**
```bash
npm install -g @lhci/cli

# Run audit
lhci autorun
```

**Config:** `lighthouserc.js`
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:9002/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
  },
};
```

### Bundle Size Tracking

**GitHub Action:**
```yaml
name: Bundle Size

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: andresz1/size-limit-action@v1
```

---

## ✅ Optimization Checklist

**Code:**
- [x] Dynamic imports for heavy components
- [x] Optimized package imports (tree-shaking)
- [x] Console statements removed (production)
- [x] ES modules instead of CommonJS
- [ ] Replace heavy dependencies
- [ ] Remove unused dependencies
- [ ] Lazy load routes

**Images:**
- [ ] Use Next.js Image component
- [ ] Compress all images (<100 KB)
- [ ] Use WebP where possible
- [ ] Lazy load images below fold

**Fonts:**
- [ ] Subset fonts (only used characters)
- [ ] Use system fonts where possible
- [ ] Preload critical fonts

**Configuration:**
- [x] Compression enabled
- [x] Source maps disabled (production)
- [x] Package optimization configured
- [ ] Bundle analyzer run
- [ ] Lighthouse audit passed

---

## 🛠️ Quick Wins

**1. Remove unused dependencies:**
```bash
npx depcheck
npm uninstall <unused-package>
```

**2. Enable gzip:**
Already enabled in `next.config.ts` ✅

**3. Lazy load admin panel:**
```typescript
const AdminPanel = dynamic(() => import('@/components/admin/AdminPanel'));
```

**4. Use native APIs:**
```typescript
// Instead of lodash
const unique = [...new Set(array)];
const debounced = setTimeout(() => fn(), 300);
```

---

## 📚 Resources

**Tools:**
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Bundlephobia](https://bundlephobia.com/) - Check package sizes
- [Size Limit](https://github.com/ai/size-limit) - Bundle size tracking

**Guides:**
- [Next.js Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [Bundle Size Best Practices](https://web.dev/fast/)

---

**Status:** ✅ Optimizations Configured  
**Next Steps:** Run bundle analyzer, measure improvements, continue optimizing
