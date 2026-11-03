import { NextResponse, type NextRequest } from 'next/server';

import { isGuardFailure, requireLeadsAccess } from '@/lib/auth/guard';
import { featureFlags } from '@/lib/flags';
import { createCsvParser, resolveLeadField, type CsvParseError } from '@/lib/leads/csv';
import { detectDuplicates, duplicateRowIndices } from '@/lib/leads/dedup';
import { createLeadFromImport, listContactIndex, recordImportBatch, type LeadInput } from '@/lib/leads/repository';

/**
 * POST /api/leads/import — chunked CSV ingestion.
 *
 * The uploaded stream is decoded and fed to the CSV parser incrementally, so a
 * large file is never buffered whole. Duplicates are FLAGGED (returned for review)
 * — never rejected and never overwritten. Row-level errors are returned and also
 * stored on the ImportBatch record.
 */
export async function POST(request: NextRequest) {
  if (!featureFlags.leadImport) {
    return NextResponse.json({ error: 'Lead import is disabled.' }, { status: 404 });
  }
  const guard = await requireLeadsAccess();
  if (isGuardFailure(guard)) return guard.response;

  const contentType = request.headers.get('content-type') ?? '';
  let stream: ReadableStream<Uint8Array> | null = request.body;
  let filename = 'upload.csv';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No CSV file provided (expected form field "file").' }, { status: 400 });
    }
    filename = file.name || filename;
    stream = file.stream();
  }
  if (!stream) return NextResponse.json({ error: 'No CSV stream provided.' }, { status: 400 });

  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const rawRows: Array<{ line: number; values: string[] }> = [];
  const errors: CsvParseError[] = [];
  const parser = createCsvParser(
    (row) => rawRows.push(row),
    (error) => errors.push(error),
  );

  let byteSize = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      byteSize += value.byteLength;
      parser.push(decoder.decode(value, { stream: true }));
    }
  }
  parser.push(decoder.decode());
  const header = parser.end();

  const fieldFor = resolveLeadField;
  const valid: Array<{ line: number; input: LeadInput }> = [];

  for (const row of rawRows) {
    const values: Record<string, string> = {};
    header.forEach((h, i) => {
      const field = fieldFor(h);
      if (field) values[field] = (row.values[i] ?? '').trim();
    });
    if (!values.businessName && !values.email && !values.phone) {
      errors.push({ line: row.line, message: 'Row has no business name, email, or phone.' });
      continue;
    }
    valid.push({ line: row.line, input: { ...values, sourceTag: values.sourceTag ?? 'CSV import' } as LeadInput });
  }

  const existing = await listContactIndex(guard.session.organizationId);
  const matches = detectDuplicates(
    existing,
    valid.map((v) => ({ email: v.input.email, phone: v.input.phone })),
  );
  const dupIndices = new Set(duplicateRowIndices(matches));

  let importedCount = 0;
  const duplicates: Array<{ line: number; reason: string }> = [];

  for (let i = 0; i < valid.length; i += 1) {
    if (dupIndices.has(i)) {
      const reasons = matches.filter((m) => m.index === i).map((m) => `${m.field}:${m.normalizedValue}`);
      duplicates.push({ line: valid[i].line, reason: reasons.join(', ') });
      continue;
    }
    await createLeadFromImport(guard.session.organizationId, guard.session.userId, valid[i].input);
    importedCount += 1;
  }

  const status: 'COMPLETED' | 'PARTIAL' | 'FAILED' =
    importedCount === 0 && (errors.length > 0 || duplicates.length > 0) ? 'FAILED' : errors.length > 0 || duplicates.length > 0 ? 'PARTIAL' : 'COMPLETED';

  const summary = {
    id: `batch_${Date.now().toString(36)}`,
    filename,
    rowCount: rawRows.length,
    importedCount,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    status,
  };

  await recordImportBatch(guard.session.organizationId, guard.session.userId, summary, { byteSize, header }, errors);

  return NextResponse.json({ ...summary, duplicates, errors });
}
