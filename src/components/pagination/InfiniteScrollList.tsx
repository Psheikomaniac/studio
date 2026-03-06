/**
 * Infinite Scroll List Component
 * 
 * Generic component for displaying paginated data with infinite scrolling.
 * Uses Intersection Observer to detect when user reaches bottom.
 * 
 * @example
 * ```typescript
 * <InfiniteScrollList
 *   query={usePaginatedQuery<Fine>('fines', 50)}
 *   renderItem={(fine) => <FineCard fine={fine} />}
 *   emptyMessage="Keine Strafen vorhanden"
 * />
 * ```
 */

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { PaginatedPage } from '@/hooks/usePaginatedQuery';

interface InfiniteScrollListProps<T> {
  /** React Query infinite query result */
  query: UseInfiniteQueryResult<InfiniteData<PaginatedPage<T>>, Error>;
  
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  
  /** Optional loading skeleton */
  loadingSkeleton?: React.ReactNode;
  
  /** Message when no data */
  emptyMessage?: string;
  
  /** Custom error renderer */
  renderError?: (error: Error) => React.ReactNode;
  
  /** Container className */
  className?: string;
  
  /** Item wrapper className */
  itemClassName?: string;
}

export function InfiniteScrollList<T extends { id: string }>({
  query,
  renderItem,
  loadingSkeleton,
  emptyMessage = 'Keine Daten vorhanden',
  renderError,
  className = '',
  itemClassName = '',
}: InfiniteScrollListProps<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = query;

  // Intersection Observer for infinite scroll
  const { ref: bottomRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Start loading 100px before bottom
  });

  // Fetch next page when bottom comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        {loadingSkeleton || (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={className}>
        {renderError ? (
          renderError(error)
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              Fehler beim Laden der Daten
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Flatten all pages into single array
  const allItems = data?.pages.flatMap(page => page.docs) ?? [];

  // Empty state
  if (allItems.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Render items
  return (
    <div className={className}>
      {allItems.map((item, index) => (
        <div key={item.id} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Load more indicator */}
      {hasNextPage && (
        <div ref={bottomRef} className="flex justify-center py-6">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lädt weitere Einträge...</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Scrolle weiter für mehr
            </span>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasNextPage && allItems.length > 10 && (
        <div className="flex justify-center py-4">
          <span className="text-xs text-muted-foreground">
            Alle Einträge geladen ({allItems.length})
          </span>
        </div>
      )}
    </div>
  );
}
