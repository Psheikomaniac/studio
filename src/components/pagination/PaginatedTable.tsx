/**
 * Paginated Table Component
 * 
 * Manual pagination with Previous/Next buttons.
 * Alternative to infinite scroll for table views.
 * 
 * @example
 * ```typescript
 * <PaginatedTable
 *   query={usePaginatedQuery<Fine>('fines', 25)}
 *   renderHeader={() => (
 *     <TableRow>
 *       <TableHead>Date</TableHead>
 *       <TableHead>Amount</TableHead>
 *     </TableRow>
 *   )}
 *   renderRow={(fine) => (
 *     <TableRow key={fine.id}>
 *       <TableCell>{fine.date}</TableCell>
 *       <TableCell>{fine.amount}</TableCell>
 *     </TableRow>
 *   )}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginatedPage } from '@/hooks/usePaginatedQuery';

interface PaginatedTableProps<T> {
  /** React Query infinite query result */
  query: UseInfiniteQueryResult<InfiniteData<PaginatedPage<T>>, Error>;
  
  /** Render table header */
  renderHeader: () => React.ReactNode;
  
  /** Render each row */
  renderRow: (item: T, index: number) => React.ReactNode;
  
  /** Message when no data */
  emptyMessage?: string;
  
  /** Table className */
  className?: string;
}

export function PaginatedTable<T extends { id: string }>({
  query,
  renderHeader,
  renderRow,
  emptyMessage = 'Keine Daten vorhanden',
  className = '',
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = query;

  // Get current page data
  const currentPageData = data?.pages[currentPage];
  const totalPages = data?.pages.length ?? 0;
  const items = currentPageData?.docs ?? [];

  // Navigation handlers
  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNext = async () => {
    // If trying to go to a page we haven't fetched yet
    if (currentPage === totalPages - 1 && hasNextPage) {
      await fetchNextPage();
      setCurrentPage(prev => prev + 1);
    } else if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          Fehler beim Laden der Daten
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && currentPage === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1 || hasNextPage;
  const totalItems = data?.pages.reduce((sum, page) => sum + page.docs.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <div className={`overflow-x-auto ${className}`}>
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              {renderHeader()}
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => renderRow(item, index))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Seite {currentPage + 1} von {hasNextPage ? `${totalPages}+` : totalPages}
          {' • '}
          {totalItems} {totalItems === 1 ? 'Eintrag' : 'Einträge'}
          {hasNextPage && ' (weitere verfügbar)'}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext || isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Lädt...
              </>
            ) : (
              <>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
