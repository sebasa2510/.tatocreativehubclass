import { describe, it, expect } from 'vitest';

import { detectDuplicates, duplicateRowIndices } from './dedup';

describe('detectDuplicates', () => {
  it('matches on normalized email regardless of case/formatting', () => {
    const matches = detectDuplicates([{ id: 'l1', email: 'jane@example.com' }], [{ email: 'JANE@Example.com' }]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ index: 0, scope: 'existing', field: 'email', matchedLeadId: 'l1' });
  });

  it('matches on normalized phone regardless of formatting', () => {
    const matches = detectDuplicates([{ id: 'l1', phone: '+13055551234' }], [{ phone: '(305) 555-1234' }]);
    expect(matches[0]).toMatchObject({ scope: 'existing', field: 'phone' });
  });

  it('flags duplicates within the same batch', () => {
    const matches = detectDuplicates([], [{ email: 'a@b.com' }, { email: 'A@B.com' }]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ index: 1, scope: 'within_batch', matchedIndex: 0 });
  });

  it('returns no matches for unique rows', () => {
    expect(detectDuplicates([{ id: 'l1', email: 'a@b.com' }], [{ email: 'c@d.com' }])).toEqual([]);
  });
});

describe('duplicateRowIndices', () => {
  it('returns sorted unique row indices', () => {
    const matches = detectDuplicates([{ id: 'l1', email: 'a@b.com' }], [{ email: 'a@b.com' }, { email: 'x@y.com' }, { email: 'A@B.com' }]);
    expect(duplicateRowIndices(matches)).toEqual([0, 2]);
  });
});
