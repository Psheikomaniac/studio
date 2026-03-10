/**
 * SVG Sanitization Utilities
 * 
 * Prevents XSS attacks through malicious SVG uploads.
 * Uses DOMPurify to strip dangerous content while preserving valid SVG.
 * 
 * Security Features:
 * - Removes <script> tags
 * - Removes event handlers (onclick, onload, etc.)
 * - Removes <iframe>, <object>, <embed>
 * - Removes javascript: URLs
 * - Validates file size (<1 MB)
 * - Validates SVG structure
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Maximum allowed SVG file size (1 MB)
 * Prevents DoS attacks via huge files
 */
const MAX_SVG_SIZE = 1024 * 1024; // 1 MB

/**
 * Forbidden SVG tags
 * These tags can execute JavaScript or embed external content
 */
const FORBIDDEN_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'foreignObject', // Can contain HTML with scripts
  'audio',
  'video',
];

/**
 * Forbidden SVG attributes
 * Event handlers and dangerous attributes
 */
const FORBIDDEN_ATTRS = [
  // Event handlers
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onmouseenter',
  'onmouseleave',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onsubmit',
  'onreset',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'ontouchstart',
  'ontouchend',
  'ontouchmove',
  
  // Other dangerous attributes
  'formaction',
  'action',
  'xmlns:xlink', // Can be used for XSS in older browsers
];

/**
 * Check if file is SVG
 * @param file - File to check
 * @returns true if file is SVG
 */
export function isSVG(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.endsWith('.svg');
}

/**
 * Sanitize SVG content
 * Removes dangerous tags and attributes while preserving valid SVG
 * 
 * @param svgString - SVG content as string
 * @returns Sanitized SVG string
 * 
 * @example
 * ```typescript
 * const malicious = '<svg><script>alert("XSS")</script></svg>';
 * const clean = sanitizeSVG(malicious);
 * // clean = '<svg></svg>' (script removed)
 * ```
 */
export function sanitizeSVG(svgString: string): string {
  // Configure DOMPurify for SVG
  const clean = DOMPurify.sanitize(svgString, {
    // Use SVG profile (safe SVG tags only)
    USE_PROFILES: { svg: true, svgFilters: true },
    
    // Allow safe SVG tags
    ADD_TAGS: ['use', 'defs', 'clipPath', 'mask'],
    
    // Forbid dangerous tags
    FORBID_TAGS: FORBIDDEN_TAGS,
    
    // Forbid dangerous attributes
    FORBID_ATTR: FORBIDDEN_ATTRS,
    
    // Forbid data URIs in href/xlink:href (can contain JS)
    ALLOW_DATA_ATTR: false,
    
    // Keep safe attributes
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });

  return clean;
}

/**
 * Validate SVG file
 * Checks file size and basic structure
 * 
 * @param file - SVG file to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const result = await validateSVGFile(file);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export async function validateSVGFile(file: File): Promise<{
  valid: boolean;
  error?: string;
  content?: string;
}> {
  // Check file type
  if (!isSVG(file)) {
    return {
      valid: false,
      error: 'Datei ist kein SVG (ungültiger MIME-Type)',
    };
  }

  // Check file size
  if (file.size > MAX_SVG_SIZE) {
    return {
      valid: false,
      error: `SVG-Datei zu groß (max. ${MAX_SVG_SIZE / 1024 / 1024} MB)`,
    };
  }

  // Read file content
  let content: string;
  try {
    content = await file.text();
  } catch {
    return {
      valid: false,
      error: 'Fehler beim Lesen der Datei',
    };
  }

  // Check if content is too large (double-check after reading)
  if (content.length > MAX_SVG_SIZE) {
    return {
      valid: false,
      error: 'SVG-Datei zu groß',
    };
  }

  // Check if it's valid SVG (contains <svg> tag)
  if (!content.includes('<svg')) {
    return {
      valid: false,
      error: 'Ungültiges SVG (kein <svg> Tag gefunden)',
    };
  }

  return {
    valid: true,
    content,
  };
}

/**
 * Validate and sanitize SVG file
 * Complete workflow: validate → sanitize → verify
 * 
 * @param file - SVG file to process
 * @returns Sanitized SVG content or error
 * 
 * @example
 * ```typescript
 * const result = await validateAndSanitizeSVG(file);
 * if (result.valid) {
 *   // Upload result.content to storage
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export async function validateAndSanitizeSVG(file: File): Promise<{
  valid: boolean;
  error?: string;
  content?: string;
}> {
  // Step 1: Validate file
  const validation = await validateSVGFile(file);
  if (!validation.valid) {
    return validation;
  }

  // Step 2: Sanitize content
  const sanitized = sanitizeSVG(validation.content!);

  // Step 3: Verify sanitized content still contains valid SVG
  if (!sanitized || !sanitized.includes('<svg')) {
    return {
      valid: false,
      error: 'SVG konnte nicht bereinigt werden (zu viele unsichere Elemente)',
    };
  }

  return {
    valid: true,
    content: sanitized,
  };
}

/**
 * Sanitize SVG from URL
 * Fetches SVG from URL and sanitizes it
 * 
 * @param url - URL to fetch SVG from
 * @returns Sanitized SVG or error
 * 
 * @example
 * ```typescript
 * const result = await sanitizeSVGFromURL('https://example.com/icon.svg');
 * if (result.valid) {
 *   return <div dangerouslySetInnerHTML={{ __html: result.content }} />;
 * }
 * ```
 */
export async function sanitizeSVGFromURL(url: string): Promise<{
  valid: boolean;
  error?: string;
  content?: string;
}> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const content = await response.text();

    // Check size
    if (content.length > MAX_SVG_SIZE) {
      return {
        valid: false,
        error: 'SVG zu groß',
      };
    }

    // Sanitize
    const sanitized = sanitizeSVG(content);

    if (!sanitized || !sanitized.includes('<svg')) {
      return {
        valid: false,
        error: 'Ungültiges SVG',
      };
    }

    return {
      valid: true,
      content: sanitized,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}
