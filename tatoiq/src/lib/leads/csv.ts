/**
 * csv.ts — RFC 4180 CSV parsing that works on streamed chunks.
 *
 * The importer feeds this parser chunk-by-chunk so large files never have to be
 * fully buffered in memory (spec: Node.js streams, no timeouts).
 */

export interface CsvParseError {
  line: number;
  message: string;
}

export interface CsvRow {
  line: number;
  values: string[];
}

export interface CsvParser {
  push(chunk: string): void;
  end(): string[];
}

/** Create a stateful parser. `onRow` fires for each data row (header excluded). */
export function createCsvParser(
  onRow: (row: CsvRow) => void,
  onError: (error: CsvParseError) => void,
): CsvParser {
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;
  let header: string[] | null = null;

  function endField() {
    row.push(field);
    field = '';
  }

  function endRow() {
    endField();
    const isBlank = row.length === 1 && row[0].trim() === '';
    if (isBlank) {
      row = [];
      return;
    }
    if (!header) {
      header = row.map((h) => h.trim());
    } else {
      onRow({ line, values: row });
    }
    row = [];
  }

  return {
    push(chunk: string) {
      for (let i = 0; i < chunk.length; i += 1) {
        const ch = chunk[i];
        if (inQuotes) {
          if (ch === '"') {
            if (chunk[i + 1] === '"') {
              field += '"';
              i += 1;
            } else {
              inQuotes = false;
            }
          } else {
            if (ch === '\n') line += 1;
            field += ch;
          }
          continue;
        }
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          endField();
        } else if (ch === '\n') {
          endRow();
          line += 1;
        } else if (ch !== '\r') {
          field += ch;
        }
      }
    },
    end() {
      if (inQuotes) {
        onError({ line, message: 'Unterminated quoted field at end of file.' });
      }
      if (field !== '' || row.length > 0) endRow();
      return header ?? [];
    },
  };
}

export interface ParsedCsv {
  header: string[];
  rows: Array<{ line: number; values: Record<string, string> }>;
  errors: CsvParseError[];
}

/** Parse a full CSV string into header-indexed row objects. */
export function parseCsv(text: string): ParsedCsv {
  const buffered: CsvRow[] = [];
  const errors: CsvParseError[] = [];

  const parser = createCsvParser(
    (r) => buffered.push(r),
    (e) => errors.push(e),
  );

  parser.push(text);
  // The header is only known once parsing finishes, so rows are buffered and
  // mapped afterwards. (Mapping during push would see an empty header.)
  const header = parser.end();

  const rows = buffered.map((r) => {
    const values: Record<string, string> = {};
    r.values.forEach((v, idx) => {
      const key = header[idx];
      if (key) values[key] = v;
    });
    return { line: r.line, values };
  });

  return { header, rows, errors };
}

/**
 * Resolve a raw CSV header to a canonical lead field name.
 *
 * Tolerant of case, surrounding whitespace, and `_`/`-`/space separators, so
 * headers like "Phone Number", "phone_number", and "PHONE" all map to `phone`.
 */
export function resolveLeadField(header: string): string | null {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return LEAD_IMPORT_ALIASES[header.trim().toLowerCase()] ?? LEAD_IMPORT_ALIASES[key] ?? null;
}

/** Aliases accepted for lead import columns (case-insensitive). */
export const LEAD_IMPORT_ALIASES: Record<string, string> = {
  business: 'businessName',
  businessname: 'businessName',
  business_name: 'businessName',
  company: 'businessName',
  contact: 'contactName',
  contactname: 'contactName',
  contact_name: 'contactName',
  name: 'contactName',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  website: 'website',
  url: 'website',
  address: 'addressLine1',
  addressline1: 'addressLine1',
  address_line1: 'addressLine1',
  street: 'addressLine1',
  city: 'city',
  state: 'state',
  province: 'state',
  postalcode: 'postalCode',
  postal_code: 'postalCode',
  zip: 'postalCode',
  industry: 'industry',
  entitytype: 'entityType',
  entity_type: 'entityType',
  sourcetag: 'sourceTag',
  source: 'sourceTag',
  source_tag: 'sourceTag',
};
