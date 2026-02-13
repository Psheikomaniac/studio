/**
 * CSV Utilities Tests
 * Tests for utility functions used in CSV parsing and data formatting
 */

import { describe, it, expect } from 'vitest';
import {
  stripBOM,
  parseGermanDate,
  parseCentsToEuro,
  formatEuro,
  classifyPunishment,
  mapBeverageCategory,
} from '@/lib/csv-utils';

describe('stripBOM', () => {
  it('should remove UTF-8 BOM from start of text', () => {
    const textWithBOM = '\uFEFFDate,Amount,Description';
    const result = stripBOM(textWithBOM);

    expect(result).toBe('Date,Amount,Description');
  });

  it('should return text unchanged if no BOM present', () => {
    const text = 'Date,Amount,Description';
    const result = stripBOM(text);

    expect(result).toBe('Date,Amount,Description');
  });

  it('should handle empty string', () => {
    const result = stripBOM('');

    expect(result).toBe('');
  });

  it('should handle text that starts with regular characters', () => {
    const text = 'Normal text without BOM';
    const result = stripBOM(text);

    expect(result).toBe('Normal text without BOM');
  });

  it('should only remove BOM from the start, not middle', () => {
    const text = 'Text\uFEFFwith BOM in middle';
    const result = stripBOM(text);

    expect(result).toBe('Text\uFEFFwith BOM in middle');
  });
});

describe('parseGermanDate', () => {
  describe('Valid dates', () => {
    it('should parse date with dash separator (DD-MM-YYYY)', () => {
      const result = parseGermanDate('15-03-2024');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2); // March is month 2 (0-indexed)
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse date with dot separator (DD.MM.YYYY)', () => {
      const result = parseGermanDate('15.03.2024');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse date with slash separator (DD/MM/YYYY)', () => {
      const result = parseGermanDate('15/03/2024');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should handle single-digit day and month', () => {
      const result = parseGermanDate('5-3-2024');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(5);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should handle dates at year boundaries', () => {
      const result = parseGermanDate('31-12-2023');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(31);
      expect(result?.getMonth()).toBe(11); // December
      expect(result?.getFullYear()).toBe(2023);
    });

    it('should handle leap year date', () => {
      const result = parseGermanDate('29-02-2024');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(29);
      expect(result?.getMonth()).toBe(1); // February
      expect(result?.getFullYear()).toBe(2024);
    });
  });

  describe('Invalid dates', () => {
    it('should return null for invalid date format', () => {
      const result = parseGermanDate('invalid');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseGermanDate('');

      expect(result).toBeNull();
    });

    it('should return null for wrong format (YYYY-MM-DD)', () => {
      const result = parseGermanDate('2024-03-15');

      expect(result).toBeNull();
    });

    it('should return null for invalid day (32)', () => {
      const result = parseGermanDate('32-03-2024');

      expect(result).toBeNull();
    });

    it('should return null for invalid month (13)', () => {
      const result = parseGermanDate('15-13-2024');

      expect(result).toBeNull();
    });

    it('should return null for invalid month (0)', () => {
      const result = parseGermanDate('15-00-2024');

      expect(result).toBeNull();
    });

    it('should return null for non-leap year Feb 29', () => {
      const result = parseGermanDate('29-02-2023');

      expect(result).toBeNull();
    });

    it('should return null for date with text', () => {
      const result = parseGermanDate('15-March-2024');

      expect(result).toBeNull();
    });

    it('should return null for incomplete date', () => {
      const result = parseGermanDate('15-03');

      expect(result).toBeNull();
    });
  });
});

describe('parseCentsToEuro', () => {
  describe('Valid inputs', () => {
    it('should convert cents to euros', () => {
      const result = parseCentsToEuro('1234');

      expect(result).toBe(12.34);
    });

    it('should handle cents with thousand separator (dot)', () => {
      const result = parseCentsToEuro('1.234');

      expect(result).toBe(12.34);
    });

    it('should handle cents with thousand separator (space)', () => {
      const result = parseCentsToEuro('1 234');

      expect(result).toBe(12.34);
    });

    it('should handle cents with comma decimal separator', () => {
      const result = parseCentsToEuro('1.234,56');

      expect(result).toBe(12.3456);
    });

    it('should handle small amounts', () => {
      const result = parseCentsToEuro('50');

      expect(result).toBe(0.50);
    });

    it('should handle large amounts with multiple separators', () => {
      const result = parseCentsToEuro('1.234.567');

      expect(result).toBe(12345.67);
    });

    it('should handle negative amounts', () => {
      const result = parseCentsToEuro('-1234');

      expect(result).toBe(-12.34);
    });

    it('should handle negative amounts with separators', () => {
      const result = parseCentsToEuro('-1.234,56');

      expect(result).toBe(-12.3456);
    });

    it('should handle zero', () => {
      const result = parseCentsToEuro('0');

      expect(result).toBe(0);
    });

    it('should handle amounts with leading/trailing spaces', () => {
      const result = parseCentsToEuro('  1234  ');

      expect(result).toBe(12.34);
    });
  });

  describe('Invalid inputs', () => {
    it('should return 0 for empty string', () => {
      const result = parseCentsToEuro('');

      expect(result).toBe(0);
    });

    it('should return 0 for only minus sign', () => {
      const result = parseCentsToEuro('-');

      expect(result).toBe(0);
    });

    it('should return 0 for non-numeric text', () => {
      const result = parseCentsToEuro('abc');

      expect(result).toBe(0);
    });

    it('should return 0 for null-like values', () => {
      const result = parseCentsToEuro('null');

      expect(result).toBe(0);
    });
  });
});

describe('formatEuro', () => {
  describe('Valid inputs', () => {
    it('should format small amounts', () => {
      const result = formatEuro(12.34);

      // German locale uses non-breaking space before €
      expect(result).toMatch(/12,34\s?€/);
    });

    it('should format large amounts with thousand separator', () => {
      const result = formatEuro(1234.56);

      // German locale uses period or space as thousand separator
      expect(result).toMatch(/1[.\s]234,56\s€/);
    });

    it('should format negative amounts', () => {
      const result = formatEuro(-50.00);

      expect(result).toMatch(/-50,00\s€/);
    });

    it('should format zero', () => {
      const result = formatEuro(0);

      expect(result).toMatch(/0,00\s?€/);
    });

    it('should always show 2 decimal places', () => {
      const result = formatEuro(10);

      expect(result).toMatch(/10,00\s?€/);
    });

    it('should round to 2 decimal places', () => {
      const result = formatEuro(12.345);

      expect(result).toMatch(/12,35\s?€/);
    });

    it('should handle very large amounts', () => {
      const result = formatEuro(1000000);

      expect(result).toMatch(/1[.\s]000[.\s]000,00\s€/);
    });

    it('should handle fractional cents', () => {
      const result = formatEuro(0.01);

      expect(result).toMatch(/0,01\s?€/);
    });
  });

  describe('Invalid inputs', () => {
    it('should return "0,00 €" for NaN', () => {
      const result = formatEuro(NaN);

      expect(result).toBe('0,00 €');
    });

    it('should return "0,00 €" for non-number types', () => {
      const result = formatEuro('not a number' as any);

      expect(result).toBe('0,00 €');
    });

    it('should handle Infinity', () => {
      const result = formatEuro(Infinity);

      // Intl.NumberFormat may handle Infinity differently
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge cases', () => {
    it('should handle very small positive amounts', () => {
      const result = formatEuro(0.001);

      expect(result).toMatch(/0,00\s?€/);
    });

    it('should handle very small negative amounts', () => {
      const result = formatEuro(-0.001);

      expect(result).toMatch(/-0,00\s?€/);
    });

    it('should maintain precision for currency-appropriate values', () => {
      const result = formatEuro(99.99);

      expect(result).toMatch(/99,99\s?€/);
    });
  });
});

describe('Integration: parseCentsToEuro + formatEuro', () => {
  it('should convert cents string to formatted euro string', () => {
    const cents = '1234';
    const euros = parseCentsToEuro(cents);
    const formatted = formatEuro(euros);

    expect(formatted).toMatch(/12,34\s?€/);
  });

  it('should handle round-trip with negative amounts', () => {
    const cents = '-5000';
    const euros = parseCentsToEuro(cents);
    const formatted = formatEuro(euros);

    expect(formatted).toMatch(/-50,00\s€/);
  });

  it('should handle round-trip with large amounts', () => {
    const cents = '123456';
    const euros = parseCentsToEuro(cents);
    const formatted = formatEuro(euros);

    expect(formatted).toMatch(/1[.\s]234,56\s€/);
  });
});

describe('classifyPunishment', () => {
  describe('classifies drinks correctly', () => {
    it.each([
      ['Getränke', 'DRINK'],
      ['Getränk', 'DRINK'],
      ['Bier', 'DRINK'],
      ['Beer penalty', 'DRINK'],
      ['Drink after training', 'DRINK'],
      ['Beverage', 'DRINK'],
      ['Trinken', 'DRINK'],
      ['Alkohol', 'DRINK'],
      ['Alcohol', 'DRINK'],
      ['Apfelwein', 'DRINK'],
      ['Appler', 'DRINK'],
      ['Äppler', 'DRINK'],
      ['Cidre', 'DRINK'],
      ['Cider', 'DRINK'],
    ])('classifies "%s" as %s', (reason, expected) => {
      expect(classifyPunishment(reason)).toBe(expected);
    });
  });

  describe('classifies fines correctly', () => {
    it.each([
      ['Zu spät gekommen', 'FINE'],
      ['Late to practice', 'FINE'],
      ['Gelbe Karte', 'FINE'],
      ['Rote Karte', 'FINE'],
      ['Vergessenes Equipment', 'FINE'],
      ['Foto in den Medien', 'FINE'],
    ])('classifies "%s" as %s', (reason, expected) => {
      expect(classifyPunishment(reason)).toBe(expected);
    });
  });

  describe('excludes false positives', () => {
    it('classifies "Kasten Bier" as FINE (not DRINK)', () => {
      expect(classifyPunishment('Kasten Bier')).toBe('FINE');
    });

    it('classifies "Runde" as FINE (not DRINK)', () => {
      expect(classifyPunishment('Runde ausgeben')).toBe('FINE');
    });
  });

  describe('handles edge cases', () => {
    it('returns FINE for empty string', () => {
      expect(classifyPunishment('')).toBe('FINE');
    });

    it('returns FINE for null/undefined', () => {
      expect(classifyPunishment(null as any)).toBe('FINE');
      expect(classifyPunishment(undefined as any)).toBe('FINE');
    });

    it('is case-insensitive', () => {
      expect(classifyPunishment('BIER')).toBe('DRINK');
      expect(classifyPunishment('bier')).toBe('DRINK');
      expect(classifyPunishment('Bier')).toBe('DRINK');
    });

    it('handles whitespace', () => {
      expect(classifyPunishment('  Bier  ')).toBe('DRINK');
    });
  });
});

describe('mapBeverageCategory', () => {
  describe('maps to Appler', () => {
    it.each(['Apfelwein', 'Appler', 'Äppler'])(
      'maps "%s" to Appler',
      (reason) => {
        expect(mapBeverageCategory(reason)).toBe('Appler');
      }
    );
  });

  describe('maps to Beer/Lemonade', () => {
    it.each(['Bier', 'Beer', 'Pils', 'Weizen', 'Radler', 'Cola', 'Sprite', 'Wasser', 'Water', 'Limo'])(
      'maps "%s" to Beer/Lemonade',
      (reason) => {
        expect(mapBeverageCategory(reason)).toBe('Beer/Lemonade');
      }
    );
  });

  describe('maps to Beverages (default)', () => {
    it.each(['Mystery Drink', 'Trinken', 'Alkohol', ''])(
      'maps "%s" to Beverages',
      (reason) => {
        expect(mapBeverageCategory(reason)).toBe('Beverages');
      }
    );
  });

  it('handles null/undefined', () => {
    expect(mapBeverageCategory(null as any)).toBe('Beverages');
    expect(mapBeverageCategory(undefined as any)).toBe('Beverages');
  });
});
