# PRD-10: Performance-Optimierung – Abschluss & Budgets

## Überblick
Dieses PRD fasst alle noch offenen Maßnahmen des Performance-Programms zusammen, setzt messbare Budgets und definiert den Abschlussprozess inkl. Monitoring. Es operationalisiert die in `docs/PRD-05-Performance-Optimization.md` beschriebenen Konzepte bis zur „Implementation Complete"-Reife.

---

## 🐝 HIVE MIND ANALYSIS: Baseline Required First!

### ⚠️ CRITICAL DISCOVERY: No Performance Data Exists

**Problem**: Cannot set budgets without current measurements!

**Missing Infrastructure**:
- ❌ No bundle analyzer configured (`@next/bundle-analyzer` not in package.json)
- ❌ No Lighthouse CI setup (no `lighthouserc.js`)
- ❌ No `reportWebVitals` implementation (not in `src/app/layout.tsx`)
- ❌ No baseline metrics documented

**Impact**: PRD-10 budgets (LCP ≤2.5s, JS ≤170KB) are **guesses** without data!

### 🎯 REVISED APPROACH: Measure First, Optimize Second

**Phase 1: Establish Baseline** (THIS PRD)
**Phase 2: Optimize** (Future PRD once we have data)

---

## 🎯 REVISED Implementation Plan

### Phase 1A: Install Measurement Tools (1-2 hours)

**1. Add Bundle Analyzer**:
```bash
npm install --save-dev @next/bundle-analyzer
```

**2. Update `next.config.ts`**:
```typescript
import type {NextConfig} from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Fixed in PRD-08
  },
  // ... rest of config
};

export default withBundleAnalyzer(nextConfig);
```

**3. Add Script to `package.json`**:
```json
"scripts": {
  "analyze": "ANALYZE=true npm run build"
}
```

**4. Run Analysis**:
```bash
npm run analyze
```
→ Opens browser with bundle visualization
→ Document sizes for `/dashboard`, `/players`, `/money`

### Phase 1B: Add Web Vitals Tracking (2-3 hours)

**1. Create `src/lib/web-vitals.ts`**:
```typescript
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // TODO: Send to analytics endpoint
  // Example: sendToAnalytics(metric)
}

export function initWebVitals() {
  onCLS(reportWebVitals);
  onFID(reportWebVitals);
  onFCP(reportWebVitals);
  onLCP(reportWebVitals);
  onTTFB(reportWebVitals);
  onINP(reportWebVitals);
}
```

**2. Update `src/app/layout.tsx`**:
```typescript
'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/web-vitals';

export default function RootLayout({ children }) {
  useEffect(() => {
    initWebVitals();
  }, []);

  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
```

**3. Install dependency**:
```bash
npm install web-vitals
```

### Phase 1C: Lighthouse CI Setup (2-3 hours)

**1. Install Lighthouse CI**:
```bash
npm install --save-dev @lhci/cli
```

**2. Create `lighthouserc.js`**:
```javascript
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run build && npm run start',
      url: [
        'http://localhost:3000/dashboard',
        'http://localhost:3000/players',
        'http://localhost:3000/money',
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Placeholder budgets - adjust after baseline
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**3. Add Script**:
```json
"scripts": {
  "lighthouse": "lhci autorun"
}
```

**4. Run Baseline**:
```bash
npm run lighthouse
```
→ Generates performance report
→ Document P75 metrics for each page

### Phase 1D: Document Baseline (1 hour)

**Create `docs/PERFORMANCE-BASELINE.md`**:
```markdown
# Performance Baseline - YYYY-MM-DD

## Bundle Sizes (Production Build)

| Route | Initial JS (gzip) | Total JS | Images | Fonts |
|-------|------------------|----------|---------|-------|
| / (Dashboard) | TBD KB | TBD KB | TBD KB | TBD KB |
| /players | TBD KB | TBD KB | TBD KB | TBD KB |
| /money | TBD KB | TBD KB | TBD KB | TBD KB |

## Lighthouse Scores (Mobile, P75)

| Route | Performance | LCP | INP | CLS |
|-------|------------|-----|-----|-----|
| /dashboard | TBD | TBD ms | TBD ms | TBD |
| /players | TBD | TBD ms | TBD ms | TBD |
| /money | TBD | TBD ms | TBD ms | TBD |

## Web Vitals (Production, 7-day avg)

- LCP (P75): TBD ms
- INP (P75): TBD ms
- CLS (P75): TBD

## Largest Contributors

- Firebase SDK: TBD KB
- Recharts: TBD KB
- shadcn/ui components: TBD KB
- Next.js runtime: TBD KB

## Next Steps

Based on baseline data, identify:
1. Heavy components to lazy-load
2. Unused dependencies to remove
3. Images to optimize
4. Code-splitting opportunities
```

---

## Budgets (TO BE SET AFTER BASELINE)

**Current PRD-10 Budgets Are Placeholders**:
- ❌ LCP ≤2.5s → Unknown if achievable
- ❌ INP ≤200ms → Unknown if achievable
- ❌ JS ≤170KB → Unknown if realistic

**After Baseline**:
- ✅ Set budgets 10-20% better than current metrics
- ✅ Incremental improvement targets
- ✅ Realistic and measurable

---

## Deliverables (PHASE 1 ONLY)

**Infrastructure**:
- ✅ `@next/bundle-analyzer` installed and configured
- ✅ `web-vitals` tracking implemented
- ✅ Lighthouse CI configured

**Documentation**:
- ✅ `docs/PERFORMANCE-BASELINE.md` with current metrics
- ✅ Bundle analysis reports (saved as artifacts)
- ✅ Lighthouse reports (3 runs per page)

**Scripts**:
- ✅ `npm run analyze` - Bundle analysis
- ✅ `npm run lighthouse` - Performance audit

**Next Phase** (Future):
- Optimization plan based on data
- Code splitting implementation
- Performance budgets enforcement

---

## Zeitplan (REVISED)

**ORIGINAL**: 2-3 Tage optimization
**REVISED Phase 1**: 6-9 Stunden baseline establishment

**Breakdown**:
- Bundle analyzer setup: 1-2 hours
- Web Vitals tracking: 2-3 hours
- Lighthouse CI: 2-3 hours
- Baseline documentation: 1 hour

**Phase 2** (Future sprint):
- Analysis of baseline data: 0.5 day
- Implementation of optimizations: 2-3 days
- Validation and budgets: 0.5 day

**Total PRD-10 Completion**: ~1 week (split across 2 sprints)

## Ziele
- Messbare Performance-Budgets für Kernseiten (mobil zuerst) einführen und erreichen.
- Systematische Umsetzung von Code-Splitting, Firebase-Lazy-Loading und Query-Optimierungen.
- Kontinuierliches Monitoring (RUM) für LCP/INP/CLS etablieren.
- Reproduzierbare CI-Messung (Lighthouse CI) und Bundle-Analyse verankern.

## Seiten-Zielgruppe
- Dashboard (`/dashboard`)
- Players (`/players`)
- Money (`/money`)

## Budgets (Mobil, Throttling „Simulated Mobile“)
- LCP ≤ 2.5s (P75)
- INP ≤ 200ms (P75)
- CLS ≤ 0.10
- JavaScript initial ≤ 170KB gzip (pro Route, ohne Runtime)
- Images: Total ≤ 300KB auf First View (ohne user-content)

## Scope & Maßnahmen
1. Firebase & Daten
   - Modularer SDK-Import (tree-shakeable), Lazy-Init nur auf client-seitigen Pfaden.
   - Realtime-Listener selektiv: nur benötigte Felder/Collections; Pagination/Limit verwenden.
   - Query-Indexierung sicherstellen (siehe PRD-07 Indizes).

2. Code-Splitting & Rendering
   - Route-level `dynamic()` Imports für schwere Komponenten (Charts, Dialoge, Tabellenmodule).
   - Client Components minimal halten; Server Components bevorzugen wo möglich (Next App Router).
   - Suspense boundaries für data-fetching Bereiche; verlässliche Skeletons einsetzen.

3. Assets & Styles
   - Next/Image mit passenden `sizes`/`priority` nur für above-the-fold.
   - Tailwind Purge (bereits aktiv); kritische CSS vermeiden; Icons als Sprite/Inline wo sinnvoll.

4. Hydration & Interaktivität
   - Vermeiden unnötiger Zustandshalter in obersten Ebenen; Memo/Callback selektiv.
   - Event-Handler nur dort binden, wo nötig; Liste/Tabellen Virtualisierung bei >100 Items.

5. Netzwerk & Caching
   - Statische Assets mit langem Cache, Revalidierung für semi-statische Daten (ISR, falls anwendbar).
   - Prefetch nur für häufig verwendete Pfade; `next/link` prefetch gezielt steuern.

6. Monitoring
   - Web Vitals Report via `next/web-vitals` nach Analytics/Logger senden.
   - Lighthouse CI in der Pipeline mit Budget-Assertionen.
   - Bundle Analyzer regelmäßig (lokal/CI) ausführen und Report archivieren.

## Technischer Plan
- Einführen einer `web-vitals.ts` mit `reportWebVitals` und Anbindung an bestehendes Logging.
- `next.config.ts` optional: `analyze` Flag unterstützen (via `@next/bundle-analyzer`).
- Relevante Komponenten (Charts, Dialoge) via `dynamic(() => import(...), { ssr: false })` oder mit Loading-Komponente aufsplitten.
- Firebase-Init in optionalen Providern lazy halten; Doppel-Initialisierung vermeiden.
- Listenkomponenten um Virtualisierung ergänzen (z. B. `@tanstack/react-virtual`), falls Datenmengen groß.

## Testplan
1. Lighthouse CI
   - Messen der drei Kernseiten in CI; Budgets als Assertions.
   - Artefakt-Reports speichern; Trend analysieren.

2. Web Vitals (RUM)
   - Lokale Erfassung validieren; Werte an Console/Mock-Endpunkt senden.
   - In E2E-Sessions exemplarisch prüfen, dass `LCP/INP/CLS` Events emittiert werden.

3. Bundle-Analyse
   - Vor/Nach Maßnahmen vergleichen; ungewöhnlich große Chunks identifizieren.

4. Funktionale Regressionen
   - E2E Smoke nach Code-Splitting und Lazy-Loads sicherstellen (Dialoge, Charts, Tabellen interaktiv).

## Akzeptanzkriterien
- Alle drei Kernseiten erfüllen die Budgets (Lighthouse mobil sim., P75 äquivalent) im CI.
- RUM-Tracking der Web Vitals aktiv; Events werden erfasst (lokaler/Mock-Endpunkt).
- Kein funktionsrelevanter Regressionsfehler durch Lazy-Loading/Splitting.
- Bundle-Größe je Route ≤ 170KB gzip initial (ohne Runtime) nach Analyse.

## Metriken
- Lighthouse Performance Score Mobil ≥ 85 für alle drei Seiten.
- P75 LCP/INP/CLS aus RUM innerhalb der Budgets (4-Wochen-Gleitfenster).
- Reduktion initialer JS-Bytes ggü. Baseline um ≥ 20%.

## Risiken
- Zu aggressives Code-Splitting kann LCP verschlechtern → Above-the-fold kritisch server-rendern.
- Firebase-Lazy kann erste Interaktion verzögern → Preconnect/keep-warm Muster erwägen.

## Deliverables
- Implementierte Optimierungen (PRs mit Vor/Nach-Messungen)
- `reportWebVitals` Implementierung und Dokumentation
- Lighthouse CI Config/Ergebnisse (z. B. `lighthouserc.js` + Pipeline Schritt)
- Bundle-Analyzer Reporte
- Abschlussdokument: `PRD-05-IMPLEMENTATION-COMPLETE.md` mit Metrikbelegen

## Zeitplan (Richtwert)
- Analyse & Budgets finalisieren: 0.5–1 Tag
- Implementierungen & Iterationen: 2–3 Tage
- Monitoring & Abschlussreport: 0.5–1 Tag
