// PRD-10: Web Vitals initialization with safe dynamic import
// Minimal metric type to avoid hard dependency on web-vitals types at compile time
export interface MinimalMetric {
  name: string;
  value: number;
  id: string;
  delta?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export function reportWebVitals(metric: MinimalMetric) {
  if (process.env.NODE_ENV === 'development') {
    // Keep console noise minimal but informative
    // Example: [WebVitals] LCP 1200 id-xxxx
    // Round values where appropriate (most metrics are in ms)
    const value = Math.round(metric.value);
    // eslint-disable-next-line no-console
    console.log('[WebVitals]', metric.name, value, metric.id);
  }
  // TODO: send to analytics endpoint if needed (e.g., Firestore/BigQuery)
}

export async function initWebVitals() {
  if (typeof window === 'undefined') return;
  try {
    const mod = await import('web-vitals');
    // Bind all core web-vitals to our reporter
    mod.onCLS(reportWebVitals);
    mod.onFID(reportWebVitals);
    mod.onFCP(reportWebVitals);
    mod.onLCP(reportWebVitals);
    mod.onTTFB(reportWebVitals);
    // INP is part of core in v4
    if (typeof mod.onINP === 'function') {
      mod.onINP(reportWebVitals);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[PRD-10] web-vitals package not available or failed to load.', e);
  }
}
