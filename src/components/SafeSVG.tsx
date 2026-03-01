/**
 * Safe SVG Display Component
 * 
 * Displays SVG content with automatic sanitization.
 * Always sanitizes before rendering to prevent XSS.
 * 
 * Usage:
 * ```typescript
 * // From URL
 * <SafeSVG src="https://example.com/icon.svg" />
 * 
 * // From string
 * <SafeSVG content={svgString} />
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { sanitizeSVG, sanitizeSVGFromURL } from '@/lib/svg-sanitizer';

interface SafeSVGProps {
  /** SVG URL to fetch and display */
  src?: string;
  
  /** SVG content as string */
  content?: string;
  
  /** Alt text for accessibility */
  alt?: string;
  
  /** CSS class names */
  className?: string;
  
  /** Loading component */
  loading?: React.ReactNode;
  
  /** Error component */
  error?: React.ReactNode;
}

export function SafeSVG({
  src,
  content,
  alt = 'SVG',
  className = '',
  loading,
  error: errorComponent,
}: SafeSVGProps) {
  const [sanitizedSVG, setSanitizedSVG] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state
    setSanitizedSVG('');
    setError(null);

    // If content is provided directly
    if (content) {
      try {
        const clean = sanitizeSVG(content);
        if (clean && clean.includes('<svg')) {
          setSanitizedSVG(clean);
        } else {
          setError('Ungültiges SVG');
        }
      } catch (err) {
        setError('Fehler beim Bereinigen des SVG');
      }
      return;
    }

    // If src URL is provided
    if (src) {
      setIsLoading(true);
      sanitizeSVGFromURL(src)
        .then(result => {
          if (result.valid && result.content) {
            setSanitizedSVG(result.content);
          } else {
            setError(result.error || 'Fehler beim Laden');
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [src, content]);

  // Loading state
  if (isLoading) {
    return loading || (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return errorComponent || (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  // No content
  if (!sanitizedSVG) {
    return null;
  }

  // Render sanitized SVG
  return (
    <div
      className={`svg-container ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
      role="img"
      aria-label={alt}
    />
  );
}
