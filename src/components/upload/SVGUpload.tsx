/**
 * SVG Upload Component
 * 
 * Secure SVG file upload with automatic sanitization.
 * Prevents XSS attacks through malicious SVG files.
 * 
 * Features:
 * - File validation (size, type)
 * - XSS prevention (sanitization)
 * - Preview before upload
 * - User-friendly error messages
 * - Progress indication
 */

'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAndSanitizeSVG } from '@/lib/svg-sanitizer';

interface SVGUploadProps {
  /** Callback when SVG is successfully uploaded */
  onUpload: (sanitizedSVG: string, fileName: string) => void | Promise<void>;
  
  /** Maximum file size in bytes (default: 1 MB) */
  maxSize?: number;
  
  /** Show preview of sanitized SVG */
  showPreview?: boolean;
  
  /** Custom upload button text */
  buttonText?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

export function SVGUpload({
  onUpload,
  maxSize = 1024 * 1024, // 1 MB
  showPreview = true,
  buttonText = 'SVG hochladen',
  disabled = false,
  className = '',
}: SVGUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setSuccess(false);
    setPreview(null);
    setFileName(file.name);
    setIsUploading(true);

    try {
      // Validate and sanitize
      const result = await validateAndSanitizeSVG(file);

      if (!result.valid) {
        setError(result.error || 'Ungültiges SVG');
        setIsUploading(false);
        return;
      }

      // Show preview
      if (showPreview && result.content) {
        setPreview(result.content);
      }

      // Upload sanitized content
      await onUpload(result.content!, file.name);

      // Success
      setSuccess(true);
      setError(null);

      // Reset form after 2 seconds
      setTimeout(() => {
        setPreview(null);
        setFileName(null);
        setSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Fehler beim Hochladen'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
          id="svg-upload-input"
        />
        
        <label htmlFor="svg-upload-input" className="inline-block">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isUploading}
            asChild
          >
            <span className="cursor-pointer">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {buttonText}
                </>
              )}
            </span>
          </Button>
        </label>

        {fileName && !success && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{fileName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            SVG erfolgreich hochgeladen und bereinigt!
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {showPreview && preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Vorschau (bereinigt):</p>
          <div className="rounded-lg border border-border p-4 bg-muted/50">
            <div 
              className="max-w-full max-h-64 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ✅ SVG wurde bereinigt: Alle Scripts und unsichere Elemente wurden entfernt.
          </p>
        </div>
      )}
    </div>
  );
}
