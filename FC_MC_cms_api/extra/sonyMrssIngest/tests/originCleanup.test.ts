import {
  assertListableName,
  assertSafeKeys,
  classify,
  windowOverlapsKeepRange,
  type SonyCleanupOptions,
} from '../originCleanup';
import type { SonyAssetMetaResult } from '../sonyOrigin';

/**
 * Mirrors isNextMonth() in ../index.ts. The cleanup's keep set and the ingest's
 * ingest set must not disagree, so this is asserted against directly.
 */
function isNextMonth(
  start: string,
  end: string,
  nextYear: number,
  nextMonth: number,
): boolean {
  if (!start || !end) return false;
  return (
    new Date(start) < new Date(nextYear, nextMonth, 1) &&
    new Date(end) > new Date(nextYear, nextMonth - 1, 1)
  );
}

const KEEP_YEAR = 2026;
const KEEP_MONTH = 9;

function ok(guid: string, start: string, end: string): SonyAssetMetaResult {
  return {
    guid,
    ok: true,
    meta: {
      id: guid,
      title: `title-${guid}`,
      description: '',
      pubDate: '',
      genres: '',
      category: '',
      duration: 0,
      rating: '',
      start,
      end,
    },
  };
}

function run(
  guids: string[],
  metas: SonyAssetMetaResult[],
  cms: Array<[string, { PK?: string; id?: string; provider?: string }]> = [],
  touched: string[] = [],
): Record<string, string> {
  const options: SonyCleanupOptions = {
    guids,
    metaByGuid: new Map(metas.map((m) => [m.guid, m])),
    touchedGuids: new Set(touched),
    keepYear: KEEP_YEAR,
    keepMonth: KEEP_MONTH,
  };

  const entries = classify(options, new Map(cms));
  return Object.fromEntries(entries.map((e) => [e.guid, e.classification]));
}

describe('windowOverlapsKeepRange', () => {
  it('agrees with the ingest isNextMonth() for keepMonths = 1', () => {
    const windows: Array<[string, string]> = [
      ['2026-08-01T00:00:00+00:00', '2026-08-31T00:00:00+00:00'], // wholly before
      ['2026-09-01T00:00:00+00:00', '2026-09-30T00:00:00+00:00'], // exactly the month
      ['2026-08-15T00:00:00+00:00', '2026-09-15T00:00:00+00:00'], // straddles the start
      ['2026-09-15T00:00:00+00:00', '2026-10-15T00:00:00+00:00'], // straddles the end
      ['2026-10-01T00:00:00+00:00', '2026-10-31T00:00:00+00:00'], // wholly after
      ['2025-01-01T00:00:00+00:00', '2027-01-01T00:00:00+00:00'], // spans it
    ];

    for (const [start, end] of windows) {
      expect(windowOverlapsKeepRange(start, end, KEEP_YEAR, KEEP_MONTH, 1)).toBe(
        isNextMonth(start, end, KEEP_YEAR, KEEP_MONTH),
      );
    }
  });
});

describe('classify', () => {
  it('keeps a folder the CMS references', () => {
    const verdicts = run(
      ['SMCF001'],
      [ok('SMCF001', '2020-01-01T00:00:00+00:00', '2021-01-01T00:00:00+00:00')],
      [['SMCF001', { PK: 'ASSET#MOVIE#SMCF001', id: 'SMCF001' }]],
    );
    expect(verdicts.SMCF001).toBe('KEEP_IN_CMS');
  });

  it('lists a folder with an expired window that the CMS does not reference', () => {
    const verdicts = run(
      ['SMCF002'],
      [ok('SMCF002', '2020-01-01T00:00:00+00:00', '2021-01-01T00:00:00+00:00')],
    );
    expect(verdicts.SMCF002).toBe('DELETE_NOT_IN_CMS');
  });

  it('keeps a folder the next ingest still has to pick up', () => {
    const verdicts = run(
      ['SMCF003'],
      [ok('SMCF003', '2026-09-01T00:00:00+00:00', '2026-09-30T00:00:00+00:00')],
    );
    expect(verdicts.SMCF003).toBe('KEEP_PENDING_INGEST');
  });

  it('keeps a window that opens after the keep range', () => {
    const verdicts = run(
      ['SMCF004'],
      [ok('SMCF004', '2027-01-01T00:00:00+00:00', '2027-02-01T00:00:00+00:00')],
    );
    expect(verdicts.SMCF004).toBe('KEEP_FUTURE_WINDOW');
  });

  it('keeps a folder whose metadata could not be read', () => {
    const verdicts = run(
      ['SMCF005'],
      [{ guid: 'SMCF005', ok: false, reason: 'cannot read SMCF005/SMCF005.xml: NoSuchKey' }],
    );
    expect(verdicts.SMCF005).toBe('KEEP_UNREADABLE');
  });

  it('keeps a folder with no metadata entry at all', () => {
    expect(run(['SMCF006'], []).SMCF006).toBe('KEEP_UNREADABLE');
  });

  /**
   * The regression that matters: StartExecution is asynchronous, so a folder
   * just submitted is not in the table yet and must not be read as unreferenced.
   */
  it('never lists a folder this run submitted, even with an expired window', () => {
    const verdicts = run(
      ['SMCF007'],
      [ok('SMCF007', '2020-01-01T00:00:00+00:00', '2021-01-01T00:00:00+00:00')],
      [],
      ['SMCF007'],
    );
    expect(verdicts.SMCF007).toBe('KEEP_TOUCHED_THIS_RUN');
  });

  it('flags an id owned by another provider instead of listing it', () => {
    const verdicts = run(
      ['SMCF008'],
      [ok('SMCF008', '2020-01-01T00:00:00+00:00', '2021-01-01T00:00:00+00:00')],
      [['SMCF008', { PK: 'ASSET#MOVIE#SMCF008', id: 'SMCF008', provider: 'someoneelse' }]],
    );
    expect(verdicts.SMCF008).toBe('KEEP_FOREIGN_PROVIDER');
  });

  it('refuses to consider a folder name that is not a bare SMCF name', () => {
    const odd = 'SMCF009 copy';
    const verdicts = run(
      [odd],
      [{ guid: odd, ok: false, reason: 'whatever' }],
    );
    expect(verdicts[odd]).toBe('KEEP_UNSAFE_NAME');
  });
});

describe('deletion guards', () => {
  it('accepts a bare SMCF folder name', () => {
    expect(assertListableName('SMCF0002500000001261')).toBe('SMCF0002500000001261');
  });

  it.each([
    'Sony',
    'Sony/2026-09.xml',
    'SMCF001/../Sony',
    '../SMCF001',
    'smcf001',
    '',
  ])('refuses to list %p', (name) => {
    expect(() => assertListableName(name)).toThrow(/refusing to list/);
  });

  it('refuses keys outside the folder being deleted', () => {
    expect(() =>
      assertSafeKeys('SMCF001', ['SMCF001/a.mpg', 'Sony/2026-09.xml']),
    ).toThrow(/outside prefix/);
  });

  it('accepts keys inside the folder being deleted', () => {
    expect(() =>
      assertSafeKeys('SMCF001', ['SMCF001/a.mpg', 'SMCF001/SMCF001.xml']),
    ).not.toThrow();
  });
});
