/**
 * export.ts — CSV export with formula-injection protection.
 *
 * Any cell beginning with =, +, -, or @ (plus tab/CR for defence in depth) is
 * prefixed with a single quote so spreadsheet apps treat it as text, never as
 * a formula.
 */

const FORMULA_INJECTION_PREFIX = /^[=+\-@\t\r]/;

/** Neutralize spreadsheet formula injection in a single value. */
export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return FORMULA_INJECTION_PREFIX.test(text) ? `'${text}` : text;
}

/** Escape a value for CSV (RFC 4180) after sanitizing it. */
export function csvEscape(value: unknown): string {
  const sanitized = sanitizeCell(value);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => unknown;
}

/** Serialize rows to CSV using the given columns. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(c.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

/** Default lead export columns. Contact fields are exported as-is (already normalized upstream). */
export interface LeadExportRow {
  id: string;
  businessName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  industry?: string | null;
  entityType?: string | null;
  grade?: string | null;
  score?: number | null;
  stage?: string | null;
  sourceTag?: string | null;
}

export const LEAD_EXPORT_COLUMNS: CsvColumn<LeadExportRow>[] = [
  { key: 'id', header: 'id', value: (r) => r.id },
  { key: 'businessName', header: 'business_name', value: (r) => r.businessName },
  { key: 'contactName', header: 'contact_name', value: (r) => r.contactName },
  { key: 'email', header: 'email', value: (r) => r.email },
  { key: 'phone', header: 'phone', value: (r) => r.phone },
  { key: 'state', header: 'state', value: (r) => r.state },
  { key: 'industry', header: 'industry', value: (r) => r.industry },
  { key: 'entityType', header: 'entity_type', value: (r) => r.entityType },
  { key: 'grade', header: 'grade', value: (r) => r.grade },
  { key: 'score', header: 'score', value: (r) => r.score },
  { key: 'stage', header: 'stage', value: (r) => r.stage },
  { key: 'sourceTag', header: 'source_tag', value: (r) => r.sourceTag },
];
