import { describe, it, expect } from 'vitest';

import { createCsvParser, resolveLeadField, parseCsv, type CsvParseError, type CsvRow } from './csv';

describe('parseCsv', () => {
  it('parses a simple document into header-indexed rows', () => {
    const { header, rows, errors } = parseCsv('business,email\nAcme,a@acme.com\nBeta,b@beta.com\n');
    expect(header).toEqual(['business', 'email']);
    expect(rows).toHaveLength(2);
    expect(rows[0].values).toEqual({ business: 'Acme', email: 'a@acme.com' });
    expect(errors).toEqual([]);
  });

  it('honours quoted fields containing commas and newlines', () => {
    const { rows } = parseCsv('business,notes\n"Acme, Inc.","line one\nline two"\n');
    expect(rows[0].values.business).toBe('Acme, Inc.');
    expect(rows[0].values.notes).toBe('line one\nline two');
  });

  it('unescapes doubled quotes', () => {
    const { rows } = parseCsv('business\n"Say ""hi"""\n');
    expect(rows[0].values.business).toBe('Say "hi"');
  });

  it('skips blank lines', () => {
    const { rows } = parseCsv('business\n\nAcme\n\n');
    expect(rows).toHaveLength(1);
  });

  it('reports an unterminated quoted field', () => {
    const errors: CsvParseError[] = [];
    const parser = createCsvParser(() => {}, (e) => errors.push(e));
    parser.push('business\n"never closed');
    parser.end();
    expect(errors[0]?.message).toMatch(/unterminated/i);
  });
});

describe('createCsvParser — streaming across chunk boundaries', () => {
  it('reassembles a row split across pushes mid-quote', () => {
    const rows: CsvRow[] = [];
    const errors: CsvParseError[] = [];
    const parser = createCsvParser((r) => rows.push(r), (e) => errors.push(e));

    parser.push('business,email\n"Ac');
    parser.push('me, Inc.",a@acme');
    parser.push('.com\n');
    const header = parser.end();

    expect(header).toEqual(['business', 'email']);
    expect(errors).toEqual([]);
    expect(rows[0].values).toEqual(['Acme, Inc.', 'a@acme.com']);
  });
});

describe('resolveLeadField', () => {
  it.each([
    ['business', 'businessName'],
    ['Company', 'businessName'],
    ['business_name', 'businessName'],
    ['email', 'email'],
    ['Phone Number', 'phone'],
    ['phone_number', 'phone'],
    ['  E-MAIL  ', 'email'],
    ['zip', 'postalCode'],
    ['source', 'sourceTag'],
  ])('maps %s → %s', (label, field) => {
    expect(resolveLeadField(label)).toBe(field);
  });

  it('returns null for unknown columns', () => {
    expect(resolveLeadField('favourite_colour')).toBeNull();
  });
});
