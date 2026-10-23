import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteObjectsCommand,
  GetBucketVersioningCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { BatchGetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import {
  DELETABLE_FOLDER_PATTERN,
  SONY_BUCKET,
  s3,
  type SonyAssetMetaResult,
} from "./sonyOrigin";

/**
 * Removes the Sony origin folders (s3://<bucket>/SMCF*\/) the CMS does not
 * reference, so a delivery cycle does not have to share the bucket with every
 * re-delivery Sony has ever sent.
 *
 * Rule
 *   For Sony the CMS asset id IS the SMCF guid, and items are keyed
 *   PK = SK = "ASSET#MOVIE#<id>". A folder is needed only if
 *   ASSET#MOVIE#<folder name> exists in the table. This is an exact key lookup
 *   via BatchGetItem, not a scan and not a title match — matching on title is
 *   wrong here, because Sony re-delivers the same title under a fresh guid
 *   every cycle, so several folders collapse onto one CMS id and every one of
 *   them would look "ingested".
 *
 * Ordering
 *   This runs only after the ingest has submitted its work, and it is handed
 *   the guids that run touched. That matters: StartExecution is asynchronous,
 *   so the assets just submitted are NOT in the table yet and an unqualified
 *   "not in the CMS" rule would delete exactly the folders the state machine is
 *   about to read. They are pinned as KEEP_TOUCHED_THIS_RUN, and
 *   KEEP_PENDING_INGEST covers the same ground independently.
 *
 * Differences from the one-off script this was migrated from, all because
 * nobody is at a terminal to type DELETE:
 *   - dry run by default (SONY_CLEANUP_DRY_RUN), so an unreviewed deploy
 *     reports instead of deleting;
 *   - a window that opens after the keep range is KEPT by default, since
 *     deleting it means the title can never be ingested;
 *   - a blast-radius cap and a ratio guard abort the run rather than delete a
 *     surprising amount — a mistyped table name reads as "nothing is in the
 *     CMS", and that must not be a delete-everything instruction;
 *   - the plan and result JSON go to S3 instead of the working directory.
 */

const TABLE_NAME = process.env.CMS_TABLE_NAME ?? "";
const SONY_PROVIDER_ID = process.env.SONY_PROVIDER_ID ?? "995eef31520dce96";
const SONY_OUTPUT_PREFIX = process.env.SONY_OUTPUT_PREFIX ?? "Sony";

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());
}

function intEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const parsed = parseFloat(process.env[name] ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ENABLED = boolEnv("SONY_CLEANUP_ENABLED", true);
const DRY_RUN = boolEnv("SONY_CLEANUP_DRY_RUN", true);
const KEEP_FUTURE = boolEnv("SONY_CLEANUP_KEEP_FUTURE", true);
const DELETE_UNREADABLE = boolEnv("SONY_CLEANUP_DELETE_UNREADABLE", false);
const PURGE_VERSIONS = boolEnv("SONY_CLEANUP_PURGE_VERSIONS", false);
const WRITE_PLAN = boolEnv("SONY_CLEANUP_WRITE_PLAN", true);
const KEEP_MONTHS = Math.max(1, intEnv("SONY_CLEANUP_KEEP_MONTHS", 1));
const CONCURRENCY = Math.max(1, intEnv("SONY_CLEANUP_CONCURRENCY", 10));
const DELETE_CONCURRENCY = Math.max(
  1,
  intEnv("SONY_CLEANUP_DELETE_CONCURRENCY", 5)
);
/** 0 disables the cap. Kept low by default; the big first sweep is a human's job. */
const MAX_FOLDERS = Math.max(0, intEnv("SONY_CLEANUP_MAX_FOLDERS", 200));
const MAX_DELETE_RATIO = floatEnv("SONY_CLEANUP_MAX_DELETE_RATIO", 0.5);
/** Stop starting new work with this much of the lambda's budget left. */
const RESERVE_MS = Math.max(5000, intEnv("SONY_CLEANUP_RESERVE_MS", 45000));

const DYNAMO_BATCH_SIZE = 100;
const S3_DELETE_BATCH_SIZE = 1000;

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export type SonyCleanupClassification =
  | "KEEP_TOUCHED_THIS_RUN"
  | "KEEP_IN_CMS"
  | "KEEP_FOREIGN_PROVIDER"
  | "KEEP_PENDING_INGEST"
  | "KEEP_FUTURE_WINDOW"
  | "KEEP_UNREADABLE"
  | "KEEP_UNSAFE_NAME"
  | "DELETE_NOT_IN_CMS"
  | "DELETE_FUTURE_WINDOW";

export interface SonyCleanupEntry {
  guid: string;
  prefix: string;
  inCms: boolean;
  title: string | null;
  provider: string | null;
  start: string | null;
  end: string | null;
  classification: SonyCleanupClassification;
  reason: string;
  objectCount?: number;
  totalBytes?: number;
}

interface CmsItem {
  PK?: string;
  id?: string;
  name?: string;
  provider?: string | string[];
}

const MOVIE_KEY_PREFIX = "ASSET#MOVIE#";

export interface SonyCleanupOptions {
  /** Every SMCF folder the ingest saw this run. */
  guids: string[];
  /** Metadata the ingest already read — the cleanup re-uses it, never re-reads. */
  metaByGuid: Map<string, SonyAssetMetaResult>;
  /** Guids this run submitted for ingestion or updated. Never deletable. */
  touchedGuids: Set<string>;
  keepYear: number;
  keepMonth: number;
  getRemainingTimeInMillis?: () => number;
}

export interface SonyCleanupResult {
  skipped: boolean;
  reason?: string;
  dryRun: boolean;
  counts: Record<string, number>;
  candidates: number;
  candidateObjects: number;
  candidateBytes: number;
  deletedFolders: string[];
  failedFolders: Array<{ guid: string; errors: unknown[] }>;
  skippedNowInCms: string[];
  deletedObjects: number;
  deletedBytes: number;
  aborted?: string;
  planKey?: string;
  resultKey?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = cursor;
        cursor += 1;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    }
  );

  await Promise.all(runners);
  return results;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function humanBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function providerToString(provider: CmsItem["provider"]): string {
  return Array.isArray(provider) ? provider.join(",") : String(provider ?? "");
}

/**
 * Guards what may enter a deletion list. A name that is not a bare SMCF folder
 * must never get this far, since every listed entry is treated as approved.
 */
export function assertListableName(guid: string): string {
  if (typeof guid !== "string" || !DELETABLE_FOLDER_PATTERN.test(guid)) {
    throw new Error(
      `[SONY-CLEANUP] refusing to list non-SMCF folder name "${guid}"`
    );
  }
  return guid;
}

/** Guards the keys actually handed to DeleteObjects. */
export function assertSafeKeys(guid: string, keys: string[]): void {
  assertListableName(guid);
  for (const key of keys) {
    if (!key.startsWith(`${guid}/`)) {
      throw new Error(
        `[SONY-CLEANUP] refusing to delete key "${key}" outside prefix "${guid}/"`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CMS lookup — exact key BatchGet, read-only
// ---------------------------------------------------------------------------

/**
 * Returns the CMS item for every guid that exists as ASSET#MOVIE#<guid>.
 * Absent guids are simply missing from the map. Throws rather than returning a
 * partial answer: a folder whose CMS status is unknown must not look removable.
 */
async function loadCmsItemsByGuid(
  guids: string[]
): Promise<Map<string, CmsItem>> {
  const found = new Map<string, CmsItem>();

  for (const batch of chunk(guids, DYNAMO_BATCH_SIZE)) {
    let keys = batch.map((guid) => ({
      PK: `ASSET#MOVIE#${guid}`,
      SK: `ASSET#MOVIE#${guid}`,
    }));

    for (let attempt = 0; keys.length > 0 && attempt < 6; attempt += 1) {
      if (attempt > 0) await sleep(2 ** attempt * 50);

      const response = await dynamoDB.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: {
              Keys: keys,
              ProjectionExpression: "#PK, #id, #name, #provider",
              ExpressionAttributeNames: {
                "#PK": "PK",
                "#id": "id",
                "#name": "name",
                "#provider": "provider",
              },
            },
          },
        })
      );

      // Keyed off PK, not the `id` attribute: the row coming back at all is
      // what proves the folder is referenced, and an item missing `id` must
      // not silently read as "no such asset".
      for (const item of (response.Responses?.[TABLE_NAME] ?? []) as CmsItem[]) {
        const guid = item.PK?.startsWith(MOVIE_KEY_PREFIX)
          ? item.PK.slice(MOVIE_KEY_PREFIX.length)
          : item.id;
        if (guid) found.set(guid, item);
      }

      keys = (response.UnprocessedKeys?.[TABLE_NAME]?.Keys ?? []) as typeof keys;
    }

    if (keys.length > 0) {
      throw new Error(
        `[SONY-CLEANUP] ${keys.length} key(s) still unprocessed after retries — aborting rather ` +
          "than treating folders whose CMS status is unknown as removable"
      );
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * With keepMonths = 1 this is exactly isNextMonth() from the ingest, including
 * its local-time month boundaries, so the cleanup's keep set and the ingest's
 * ingest set cannot disagree.
 */
export function windowOverlapsKeepRange(
  start: string,
  end: string,
  keepYear: number,
  keepMonth: number,
  keepMonths: number
): boolean {
  const from = new Date(start);
  const to = new Date(end);
  const rangeStart = new Date(keepYear, keepMonth - 1, 1);
  const rangeEnd = new Date(keepYear, keepMonth - 1 + keepMonths, 1);
  return from < rangeEnd && to > rangeStart;
}

function classifyCmsHit(item: CmsItem): {
  classification: SonyCleanupClassification;
  reason: string;
} {
  const provider = providerToString(item.provider);
  if (provider && !provider.includes(SONY_PROVIDER_ID)) {
    return {
      classification: "KEEP_FOREIGN_PROVIDER",
      reason: `CMS item exists but provider is ${provider}, not Sony`,
    };
  }
  return {
    classification: "KEEP_IN_CMS",
    reason: `referenced by CMS asset ${item.id ?? item.PK}`,
  };
}

function classifyCmsMiss(
  meta: SonyAssetMetaResult | undefined,
  keepYear: number,
  keepMonth: number
): { classification: SonyCleanupClassification; reason: string } {
  if (!meta || !meta.ok) {
    const reason = meta?.ok === false ? meta.reason : "metadata was not read";
    return DELETE_UNREADABLE
      ? {
          classification: "DELETE_NOT_IN_CMS",
          reason: `not in CMS; ${reason}`,
        }
      : { classification: "KEEP_UNREADABLE", reason };
  }

  const { start, end } = meta.meta;

  if (windowOverlapsKeepRange(start, end, keepYear, keepMonth, KEEP_MONTHS)) {
    return {
      classification: "KEEP_PENDING_INGEST",
      reason: `not in CMS yet, window ${start}..${end} overlaps the next ${KEEP_MONTHS} month(s)`,
    };
  }

  const rangeEnd = new Date(keepYear, keepMonth - 1 + KEEP_MONTHS, 1);
  if (new Date(start) >= rangeEnd) {
    return KEEP_FUTURE
      ? { classification: "KEEP_FUTURE_WINDOW", reason: `window opens ${start}` }
      : {
          classification: "DELETE_FUTURE_WINDOW",
          reason: `not in CMS, window opens ${start}`,
        };
  }

  return {
    classification: "DELETE_NOT_IN_CMS",
    reason: `no ASSET#MOVIE item for this folder name (window ${start}..${end})`,
  };
}

/** Exported for offline testing of the pure decision logic (no AWS calls). */
export function classify(
  options: SonyCleanupOptions,
  cmsItems: Map<string, CmsItem>
): SonyCleanupEntry[] {
  const { guids, metaByGuid, touchedGuids, keepYear, keepMonth } = options;

  return guids.map((guid) => {
    const cmsItem = cmsItems.get(guid);
    const meta = metaByGuid.get(guid);

    let verdict: {
      classification: SonyCleanupClassification;
      reason: string;
    };

    if (touchedGuids.has(guid)) {
      verdict = {
        classification: "KEEP_TOUCHED_THIS_RUN",
        reason: "submitted for ingestion or updated by this run",
      };
    } else if (!DELETABLE_FOLDER_PATTERN.test(guid)) {
      verdict = {
        classification: "KEEP_UNSAFE_NAME",
        reason: "folder name is not a bare SMCF name — never eligible for deletion",
      };
    } else if (cmsItem) {
      verdict = classifyCmsHit(cmsItem);
    } else {
      verdict = classifyCmsMiss(meta, keepYear, keepMonth);
    }

    return {
      guid,
      prefix: `${guid}/`,
      inCms: Boolean(cmsItem),
      title: cmsItem?.name ?? (meta?.ok ? meta.meta.title : meta?.title) ?? null,
      provider: cmsItem ? providerToString(cmsItem.provider) || null : null,
      start: meta?.ok ? meta.meta.start : null,
      end: meta?.ok ? meta.meta.end : null,
      classification: verdict.classification,
      reason: verdict.reason,
    };
  });
}

// ---------------------------------------------------------------------------
// S3 object access
// ---------------------------------------------------------------------------

interface DeletionTarget {
  Key: string;
  VersionId?: string;
  Size: number;
}

async function listPrefixObjects(guid: string): Promise<DeletionTarget[]> {
  const objects: DeletionTarget[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: SONY_BUCKET,
        Prefix: `${guid}/`,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) objects.push({ Key: item.Key, Size: item.Size ?? 0 });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

async function listPrefixVersions(guid: string): Promise<DeletionTarget[]> {
  const versions: DeletionTarget[] = [];
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: SONY_BUCKET,
        Prefix: `${guid}/`,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      })
    );

    for (const item of response.Versions ?? []) {
      if (item.Key) {
        versions.push({
          Key: item.Key,
          VersionId: item.VersionId,
          Size: item.Size ?? 0,
        });
      }
    }
    for (const item of response.DeleteMarkers ?? []) {
      if (item.Key) {
        versions.push({ Key: item.Key, VersionId: item.VersionId, Size: 0 });
      }
    }

    keyMarker = response.IsTruncated ? response.NextKeyMarker : undefined;
    versionIdMarker = response.IsTruncated
      ? response.NextVersionIdMarker
      : undefined;
  } while (keyMarker || versionIdMarker);

  return versions;
}

async function isVersioningEnabled(): Promise<boolean> {
  try {
    const response = await s3.send(
      new GetBucketVersioningCommand({ Bucket: SONY_BUCKET })
    );
    return response.Status === "Enabled" || response.Status === "Suspended";
  } catch (err) {
    console.warn(
      `[SONY-CLEANUP] Could not read bucket versioning: ${String(err)}`
    );
    return false;
  }
}

async function deletePrefix(
  guid: string,
  purgeVersions: boolean
): Promise<{
  guid: string;
  deleted: number;
  bytes: number;
  errors: unknown[];
}> {
  const targets = purgeVersions
    ? await listPrefixVersions(guid)
    : await listPrefixObjects(guid);

  if (targets.length === 0) return { guid, deleted: 0, bytes: 0, errors: [] };

  assertSafeKeys(
    guid,
    targets.map((t) => t.Key)
  );

  let deleted = 0;
  let bytes = 0;
  const errors: unknown[] = [];

  for (const batch of chunk(targets, S3_DELETE_BATCH_SIZE)) {
    const response = await s3.send(
      new DeleteObjectsCommand({
        Bucket: SONY_BUCKET,
        Delete: {
          Objects: batch.map((t) =>
            t.VersionId ? { Key: t.Key, VersionId: t.VersionId } : { Key: t.Key }
          ),
          Quiet: true,
        },
      })
    );

    const failures = response.Errors ?? [];
    deleted += batch.length - failures.length;
    bytes += batch.reduce((sum, t) => sum + (t.Size ?? 0), 0);
    for (const err of failures) {
      errors.push({ key: err.Key, code: err.Code, message: err.Message });
    }
  }

  return { guid, deleted, bytes, errors };
}

async function writeJsonToS3(
  key: string,
  data: unknown,
  label: string
): Promise<void> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: SONY_BUCKET,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: "application/json",
      })
    );
    console.log(`[SONY-CLEANUP] ${label} written to s3://${SONY_BUCKET}/${key}`);
  } catch (err) {
    // A missing audit file must not fail the run or, worse, block the deletes
    // that already happened from being reported in the lambda's response.
    console.warn(`[SONY-CLEANUP] Could not write ${label} to ${key}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function summarize(entries: SonyCleanupEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    counts[entry.classification] = (counts[entry.classification] ?? 0) + 1;
  }

  console.log("[SONY-CLEANUP] ----------------- classification -----------------");
  for (const name of Object.keys(counts).sort()) {
    console.log(`[SONY-CLEANUP]   ${name.padEnd(24)} ${String(counts[name]).padStart(6)}`);
  }
  console.log("[SONY-CLEANUP] --------------------------------------------------");

  const foreign = entries.filter(
    (e) => e.classification === "KEEP_FOREIGN_PROVIDER"
  );
  if (foreign.length > 0) {
    console.warn(
      `[SONY-CLEANUP] !! ${foreign.length} folder name(s) match a CMS asset owned by another ` +
        "provider — kept, but that is an id collision worth checking."
    );
  }

  const unreadable = entries.filter(
    (e) => e.classification === "KEEP_UNREADABLE"
  );
  if (unreadable.length > 0) {
    console.warn(
      `[SONY-CLEANUP] ${unreadable.length} folder(s) are not in the CMS and could not be ` +
        "classified, so they were kept. Review them before enabling SONY_CLEANUP_DELETE_UNREADABLE."
    );
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runSonyOriginCleanup(
  options: SonyCleanupOptions
): Promise<SonyCleanupResult> {
  const empty: SonyCleanupResult = {
    skipped: true,
    dryRun: DRY_RUN,
    counts: {},
    candidates: 0,
    candidateObjects: 0,
    candidateBytes: 0,
    deletedFolders: [],
    failedFolders: [],
    skippedNowInCms: [],
    deletedObjects: 0,
    deletedBytes: 0,
  };

  if (!ENABLED) {
    console.log("[SONY-CLEANUP] Disabled via SONY_CLEANUP_ENABLED — skipping.");
    return { ...empty, reason: "disabled" };
  }
  if (!TABLE_NAME) {
    console.warn("[SONY-CLEANUP] CMS_TABLE_NAME not set — skipping.");
    return { ...empty, reason: "no table name" };
  }
  if (options.guids.length === 0) {
    console.log("[SONY-CLEANUP] No origin folders — nothing to do.");
    return { ...empty, reason: "no folders" };
  }

  const runAt = new Date().toISOString();
  const budgetLeft = () =>
    options.getRemainingTimeInMillis?.() ?? Number.POSITIVE_INFINITY;

  console.log(
    `[SONY-CLEANUP] Bucket=s3://${SONY_BUCKET} table=${TABLE_NAME} (read-only) ` +
      `provider=${SONY_PROVIDER_ID} keepFrom=${options.keepYear}-` +
      `${String(options.keepMonth).padStart(2, "0")} keepMonths=${KEEP_MONTHS} ` +
      `dryRun=${DRY_RUN}`
  );

  const cmsItems = await loadCmsItemsByGuid(options.guids);
  console.log(
    `[SONY-CLEANUP] ${cmsItems.size} of ${options.guids.length} folders are referenced by a CMS asset`
  );

  const entries = classify(options, cmsItems);
  const counts = summarize(entries);

  const candidates = entries.filter((e) => e.classification.startsWith("DELETE"));

  // Sizing is also the pre-flight proof that every candidate prefix is readable.
  if (candidates.length > 0 && budgetLeft() > RESERVE_MS) {
    await mapWithConcurrency(candidates, CONCURRENCY, async (entry) => {
      try {
        const objects = await listPrefixObjects(entry.guid);
        entry.objectCount = objects.length;
        entry.totalBytes = objects.reduce((sum, o) => sum + o.Size, 0);
      } catch (err) {
        console.warn(`[SONY-CLEANUP] Could not size ${entry.guid}/:`, err);
      }
    });
  }

  const candidateObjects = candidates.reduce(
    (sum, e) => sum + (e.objectCount ?? 0),
    0
  );
  const candidateBytes = candidates.reduce(
    (sum, e) => sum + (e.totalBytes ?? 0),
    0
  );

  console.log(
    `[SONY-CLEANUP] LISTED FOR REMOVAL: ${candidates.length} folders / ` +
      `${candidateObjects} objects / ${humanBytes(candidateBytes)}`
  );

  let names: string[];
  try {
    names = candidates.map((e) => assertListableName(e.guid)).sort();
  } catch (err) {
    console.error("[SONY-CLEANUP] Aborting — unsafe name reached the list:", err);
    return { ...empty, skipped: false, counts, aborted: String(err) };
  }

  const planKey =
    `${SONY_OUTPUT_PREFIX}/cleanup/${runAt.slice(0, 10)}-` +
    `${DRY_RUN ? "plan" : "executed"}.json`;

  if (WRITE_PLAN) {
    await writeJsonToS3(
      planKey,
      {
        rule: "folder-name-in-cms",
        bucket: SONY_BUCKET,
        table: TABLE_NAME,
        sonyProviderId: SONY_PROVIDER_ID,
        builtAt: runAt,
        keepFrom: `${options.keepYear}-${String(options.keepMonth).padStart(2, "0")}`,
        options: {
          DRY_RUN,
          KEEP_MONTHS,
          KEEP_FUTURE,
          DELETE_UNREADABLE,
          PURGE_VERSIONS,
          MAX_FOLDERS,
          MAX_DELETE_RATIO,
        },
        counts,
        foldersToDelete: names,
        entries,
      },
      "Cleanup plan"
    );
  }

  const base: SonyCleanupResult = {
    ...empty,
    skipped: false,
    counts,
    candidates: candidates.length,
    candidateObjects,
    candidateBytes,
    planKey: WRITE_PLAN ? planKey : undefined,
  };

  if (DRY_RUN) {
    console.log(
      "[SONY-CLEANUP] DRY RUN — nothing was deleted. Set SONY_CLEANUP_DRY_RUN=false to arm it."
    );
    return base;
  }

  if (names.length === 0) {
    console.log("[SONY-CLEANUP] Nothing to delete.");
    return base;
  }

  // Blast-radius guards. A wrong table name reads as "nothing is in the CMS",
  // and that must never be an instruction to empty the bucket.
  const ratio = candidates.length / entries.length;
  if (MAX_DELETE_RATIO > 0 && ratio > MAX_DELETE_RATIO) {
    const aborted =
      `${candidates.length}/${entries.length} folders (${(ratio * 100).toFixed(1)}%) were listed ` +
      `for removal, above SONY_CLEANUP_MAX_DELETE_RATIO=${MAX_DELETE_RATIO} — aborting without ` +
      "deleting. Review the plan, then raise the ratio if it really is correct.";
    console.error(`[SONY-CLEANUP] ABORT: ${aborted}`);
    return { ...base, aborted };
  }

  if (MAX_FOLDERS > 0 && names.length > MAX_FOLDERS) {
    console.warn(
      `[SONY-CLEANUP] ${names.length} folders listed but SONY_CLEANUP_MAX_FOLDERS=${MAX_FOLDERS} — ` +
        `deleting the first ${MAX_FOLDERS} this run, the rest next run.`
    );
    names = names.slice(0, MAX_FOLDERS);
  }

  const versioned = await isVersioningEnabled();
  const purgeVersions = PURGE_VERSIONS && versioned;
  if (versioned && !purgeVersions) {
    console.warn(
      "[SONY-CLEANUP] Bucket versioning is on: deletes leave delete markers and previous " +
        "versions in place, so storage will NOT be reclaimed. Set " +
        "SONY_CLEANUP_PURGE_VERSIONS=true to remove every version permanently."
    );
  }

  // The classification can be minutes old and the state machine writes while we
  // work; anything that became referenced since is dropped from the batch.
  const fresh = await loadCmsItemsByGuid(names);
  const skippedNowInCms = names.filter((guid) => fresh.has(guid));
  const toDelete = names.filter((guid) => !fresh.has(guid));

  if (skippedNowInCms.length > 0) {
    console.warn(
      `[SONY-CLEANUP] ${skippedNowInCms.length} folder(s) became referenced since classification ` +
        `and will NOT be deleted: ${skippedNowInCms.join(", ")}`
    );
  }

  if (toDelete.length === 0) {
    console.log("[SONY-CLEANUP] Nothing left to delete after re-checking the CMS.");
    return { ...base, skippedNowInCms };
  }

  let ranOutOfTime = 0;
  const results = await mapWithConcurrency(
    toDelete,
    DELETE_CONCURRENCY,
    async (guid) => {
      if (budgetLeft() < RESERVE_MS) {
        ranOutOfTime += 1;
        return { guid, deleted: 0, bytes: 0, errors: [], deferred: true };
      }
      try {
        return { ...(await deletePrefix(guid, purgeVersions)), deferred: false };
      } catch (err) {
        return {
          guid,
          deleted: 0,
          bytes: 0,
          errors: [{ message: String(err) }],
          deferred: false,
        };
      }
    }
  );

  if (ranOutOfTime > 0) {
    console.warn(
      `[SONY-CLEANUP] Ran out of lambda time — ${ranOutOfTime} folder(s) deferred to the next run.`
    );
  }

  const attempted = results.filter((r) => !r.deferred);
  const failed = attempted.filter((r) => r.errors.length > 0);
  const succeeded = attempted.filter((r) => r.errors.length === 0);
  const deletedObjects = attempted.reduce((sum, r) => sum + r.deleted, 0);
  const deletedBytes = attempted.reduce((sum, r) => sum + r.bytes, 0);

  console.log(
    `[SONY-CLEANUP] Deleted ${deletedObjects} objects (${humanBytes(deletedBytes)}) across ` +
      `${succeeded.length} folders`
  );
  if (failed.length > 0) {
    console.error(`[SONY-CLEANUP] ${failed.length} folder(s) reported errors.`);
  }

  const final: SonyCleanupResult = {
    ...base,
    skippedNowInCms,
    deletedFolders: succeeded.map((r) => r.guid),
    failedFolders: failed.map((r) => ({ guid: r.guid, errors: r.errors })),
    deletedObjects,
    deletedBytes,
  };

  const resultKey = `${SONY_OUTPUT_PREFIX}/cleanup/${runAt.slice(0, 10)}-result.json`;
  if (WRITE_PLAN) {
    await writeJsonToS3(
      resultKey,
      { ...final, ranAt: runAt, purgedVersions: purgeVersions, deferred: ranOutOfTime },
      "Deletion result"
    );
    final.resultKey = resultKey;
  }

  return final;
}
