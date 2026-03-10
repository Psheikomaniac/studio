/**
 * SVG Sanitizer Tests
 */

import { describe, it, expect } from 'vitest';
import { isSVG, sanitizeSVG, validateSVGFile, validateAndSanitizeSVG } from '@/lib/svg-sanitizer';

const VALID_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';

function makeFile(content: string, name = 'test.svg', type = 'image/svg+xml'): File {
  return new File([content], name, { type });
}

describe('isSVG', () => {
  it('returns true for svg mime type', () => {
    expect(isSVG(makeFile('', 'test.svg', 'image/svg+xml'))).toBe(true);
  });

  it('returns true for .svg extension regardless of mime type', () => {
    expect(isSVG(makeFile('', 'test.svg', 'application/octet-stream'))).toBe(true);
  });

  it('returns false for non-svg files', () => {
    expect(isSVG(makeFile('', 'test.png', 'image/png'))).toBe(false);
  });
});

describe('sanitizeSVG', () => {
  it('removes script tags', () => {
    const malicious = '<svg><script>alert("XSS")</script></svg>';
    expect(sanitizeSVG(malicious)).not.toContain('<script');
  });

  it('removes event handlers', () => {
    const malicious = '<svg><rect onclick="alert(1)"/></svg>';
    expect(sanitizeSVG(malicious)).not.toContain('onclick');
  });

  it('preserves valid SVG content', () => {
    const result = sanitizeSVG(VALID_SVG);
    expect(result).toContain('<svg');
    expect(result).toContain('circle');
  });
});

describe('validateSVGFile', () => {
  it('rejects non-svg files', async () => {
    const file = makeFile('<svg/>', 'test.png', 'image/png');
    const result = await validateSVGFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('SVG');
  });

  it('rejects files exceeding default size limit (1 MB)', async () => {
    const large = 'x'.repeat(1024 * 1024 + 1);
    const file = makeFile(large);
    const result = await validateSVGFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('groß');
  });

  it('respects custom maxSize — rejects file larger than limit', async () => {
    const content = VALID_SVG + ' '.repeat(500);
    const file = makeFile(content);
    const result = await validateSVGFile(file, 100); // 100 bytes
    expect(result.valid).toBe(false);
    expect(result.error).toContain('groß');
  });

  it('respects custom maxSize — accepts file within limit', async () => {
    const file = makeFile(VALID_SVG);
    const result = await validateSVGFile(file, 5 * 1024 * 1024); // 5 MB
    expect(result.valid).toBe(true);
  });

  it('error message reflects custom maxSize', async () => {
    const maxSize = 512 * 1024; // 0.5 MB
    const content = 'x'.repeat(maxSize + 1);
    const file = makeFile(content);
    const result = await validateSVGFile(file, maxSize);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('0.5 MB');
  });

  it('rejects files without <svg> tag', async () => {
    const file = makeFile('<not-svg/>');
    const result = await validateSVGFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('svg');
  });

  it('returns content for valid SVG', async () => {
    const file = makeFile(VALID_SVG);
    const result = await validateSVGFile(file);
    expect(result.valid).toBe(true);
    expect(result.content).toContain('<svg');
  });
});

describe('validateAndSanitizeSVG', () => {
  it('validates and sanitizes a valid SVG', async () => {
    const file = makeFile(VALID_SVG);
    const result = await validateAndSanitizeSVG(file);
    expect(result.valid).toBe(true);
    expect(result.content).toContain('<svg');
  });

  it('passes custom maxSize through to validation', async () => {
    const file = makeFile(VALID_SVG);
    const result = await validateAndSanitizeSVG(file, 10); // 10 bytes — too small
    expect(result.valid).toBe(false);
    expect(result.error).toContain('groß');
  });

  it('removes XSS from otherwise valid SVG', async () => {
    const file = makeFile('<svg><script>alert(1)</script><circle r="5"/></svg>');
    const result = await validateAndSanitizeSVG(file);
    expect(result.valid).toBe(true);
    expect(result.content).not.toContain('<script');
  });
});
