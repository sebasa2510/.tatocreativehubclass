import { describe, it, expect } from 'vitest';

import { csvEscape, sanitizeCell, toCsv } from './export';

describe('sanitizeCell — spreadsheet formula-injection guard', () => {
  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '=HYPERLINK("http://evil")'])(
    'prefixes a formula-looking cell with a single quote: %s',
    (value) => {
      expect(sanitizeCell(value)).toBe(`'${value}`);
    },
  );

  it('leaves ordinary values untouched', () => {
    expect(sanitizeCell('Brickell Builders LLC')).toBe('Brickell Builders LLC');
    expect(sanitizeCell(42)).toBe('42');
    expect(sanitizeCell(null)).toBe('');
  });
});

describe('csvEscape', () => {
  it('quotes values containing commas, quotes, or newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('renders a header row and sanitized body', () => {
    const csv = toCsv([{ name: '=cmd', city: 'Miami' }], [
      { key: 'name', header: 'name', value: (r) => r.name },
      { key: 'city', header: 'city', value: (r) => r.city },
    ]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('name,city');
    expect(row).toBe("'=cmd,Miami");
  });
});
