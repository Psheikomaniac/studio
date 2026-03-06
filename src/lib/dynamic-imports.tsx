/**
 * Dynamic Import Utilities
 * 
 * Centralized dynamic imports for code splitting.
 * Improves initial page load by lazy-loading heavy components.
 * 
 * Usage:
 * ```typescript
 * import { DynamicCharts } from '@/lib/dynamic-imports';
 * 
 * <DynamicCharts data={chartData} />
 * ```
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Default loading component
 */
const DefaultLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

/**
 * Skeleton loading for cards
 */
const CardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-6 space-y-4">
    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
    <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
    <div className="h-32 bg-muted animate-pulse rounded" />
  </div>
);

/**
 * Dynamic imports for heavy components
 */

// Charts (if using recharts/chart.js - heavy libraries)
export const DynamicCharts = dynamic(
  // @ts-ignore – placeholder component, not yet implemented
  () => import('@/components/charts/Charts').catch(() => ({ default: () => <div>Charts not available</div> })),
  {
    loading: DefaultLoading,
    ssr: false, // Charts are client-side only
  }
);

// Admin Panel (heavy with many components)
export const DynamicAdminPanel = dynamic(
  // @ts-ignore – placeholder component, not yet implemented
  () => import('@/components/admin/AdminPanel').catch(() => ({ default: () => <div>Admin not available</div> })),
  {
    loading: DefaultLoading,
    ssr: false,
  }
);

// PDF Export (heavy PDF library)
export const DynamicPDFExport = dynamic(
  // @ts-ignore – placeholder component, not yet implemented
  () => import('@/components/export/PDFExport').catch(() => ({ default: () => <div>PDF export not available</div> })),
  {
    loading: () => (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">PDF-Bibliothek wird geladen...</span>
      </div>
    ),
    ssr: false,
  }
);

// Rich Text Editor (if used - very heavy)
export const DynamicEditor = dynamic(
  // @ts-ignore – placeholder component, not yet implemented
  () => import('@/components/editor/RichEditor').catch(() => ({ default: () => <div>Editor not available</div> })),
  {
    loading: DefaultLoading,
    ssr: false,
  }
);

// Data Tables with heavy features (sorting, filtering, etc.)
export const DynamicDataTable = dynamic(
  // @ts-ignore – placeholder component, not yet implemented
  () => import('@/components/tables/DataTable').catch(() => ({ default: () => <div>Table not available</div> })),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ),
    ssr: true, // Tables can be SSR'd for SEO
  }
);

/**
 * Lazy load modals/dialogs
 * Only loaded when triggered
 */
export const lazyLoadModal = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) => {
  return dynamic(importFn, {
    loading: () => (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-6 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    ),
    ssr: false,
  });
};

/**
 * Prefetch utility
 * Preload components on user interaction (hover, click proximity)
 */
export const prefetchComponent = (importFn: () => Promise<any>) => {
  // Start loading in background
  const loadComponent = () => {
    importFn().catch(err => {
      console.warn('Prefetch failed:', err);
    });
  };

  return {
    onMouseEnter: loadComponent,
    onFocus: loadComponent,
  };
};

/**
 * Example: Lazy load modal
 * 
 * const LazySettingsModal = lazyLoadModal(() => 
 *   import('@/components/modals/SettingsModal')
 * );
 * 
 * // Usage
 * {showSettings && <LazySettingsModal onClose={() => setShowSettings(false)} />}
 */
