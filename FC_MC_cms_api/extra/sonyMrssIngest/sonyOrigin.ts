import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { parseStringPromise } from "xml2js";

export const SONY_BUCKET = process.env.SONY_BUCKET ?? "sony-freecast";

export const s3 = new S3Client({});

/**
 * What the ingest treats as a Sony delivery folder. Deliberately loose so the
 * cleanup sees exactly the same folder set the ingest does.
 */
const SONY_FOLDER_PREFIX = /^SMCF/i;

/**
 * Stricter than SONY_FOLDER_PREFIX: the exact shape a folder name must have
 * before the cleanup is allowed to put it on a deletion list. Anything holding
 * a slash, a parent-directory hop or a different prefix is rejected, so the
 * generated MRSS feeds under `Sony/` can never be reached from a delete path.
 */
export const DELETABLE_FOLDER_PATTERN = /^SMCF[A-Za-z0-9._-]*$/;

export interface SonyAssetMeta {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  genres: string;
  category: string;
  duration: number;
  rating: string;
  start: string;
  end: string;
}

/**
 * Why a folder could not be described is part of the result, not a dropped
 * `null`: the cleanup has to tell "Sony sent us junk" apart from "S3 blipped",
 * and must never treat the second as grounds for deletion.
 */
export type SonyAssetMetaResult =
  | { guid: string; ok: true; meta: SonyAssetMeta }
  | { guid: string; ok: false; reason: string; title?: string };

export function convertHMS(value: string): number {
  const parts = value.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function describeError(err: unknown): string {
  const e = err as { name?: string; Code?: string; message?: string };
  return e?.name ?? e?.Code ?? e?.message ?? String(err);
}

/** Keeps the `+00:00` offset form the MRSS `<dcterms:valid>` element expects. */
function toOffsetIso(raw: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().replace("Z", "+00:00");
}

export async function listSonyGuids(): Promise<string[]> {
  const guids: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: SONY_BUCKET,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      })
    );

    for (const prefix of response.CommonPrefixes ?? []) {
      if (prefix.Prefix) {
        const guid = prefix.Prefix.replace(/\/$/, "");
        // Only include Sony asset GUIDs — must start with "SMCF"
        if (SONY_FOLDER_PREFIX.test(guid)) {
          guids.push(guid);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`[SONY-INGEST] Found ${guids.length} GUIDs in bucket`);
  console.log(`[SONY-INGEST] GUIDs: ${guids.join(", ")}`);

  return guids;
}

export async function fetchAssetMeta(
  guid: string
): Promise<SonyAssetMetaResult> {
  const key = `${guid}/${guid}.xml`;

  let xmlBody: string;
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: SONY_BUCKET, Key: key })
    );
    xmlBody = await response.Body!.transformToString();
  } catch (err) {
    return { guid, ok: false, reason: `cannot read ${key}: ${describeError(err)}` };
  }

  let parsed: any;
  try {
    parsed = await parseStringPromise(xmlBody);
  } catch (err) {
    return { guid, ok: false, reason: `cannot parse ${key}: ${describeError(err)}` };
  }

  const metadata = parsed?.ADI?.Asset?.[0]?.Metadata?.[0];
  if (!metadata) {
    return { guid, ok: false, reason: `no ADI.Asset[0].Metadata[0] in ${key}` };
  }

  const appData: Array<{ $: { Name: string; Value: string } }> =
    metadata.App_Data ?? [];
  const get = (name: string): string =>
    appData.find((d) => d.$?.Name === name)?.$.Value ?? "";

  const title = get("Title");
  const startRaw = get("Licensing_Window_Start");
  const endRaw = get("Licensing_Window_End");
  const durationRaw = get("Run_Time");

  const start = toOffsetIso(startRaw);
  const end = toOffsetIso(endRaw);

  // Without a usable window the ingest could not have scheduled it anyway, and
  // the cleanup cannot decide whether the next run still needs the folder.
  if (!start || !end) {
    return {
      guid,
      ok: false,
      title,
      reason: `missing/invalid licensing window (start="${startRaw}", end="${endRaw}")`,
    };
  }

  return {
    guid,
    ok: true,
    meta: {
      id: guid,
      title,
      description: get("Summary_Long") || get("Summary_Short"),
      pubDate: get("Original_Air_Date") || get("Year_of_Production"),
      genres: get("Genre"),
      category: get("Category"),
      duration: durationRaw ? convertHMS(durationRaw) : 0,
      rating: get("Rating"),
      start,
      end,
    },
  };
}
