import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { runSonyOriginCleanup, type SonyCleanupResult } from "./originCleanup";
import {
  fetchAssetMeta,
  listSonyGuids,
  s3,
  SONY_BUCKET,
  type SonyAssetMeta,
  type SonyAssetMetaResult,
} from "./sonyOrigin";

const PROVIDER_NAME = process.env.SONY_PROVIDER_NAME ?? "Sony Movies";
const PACKAGE_NAME = process.env.SONY_PACKAGE_NAME ?? "Value Channels";
const SONY_OUTPUT_PREFIX = process.env.SONY_OUTPUT_PREFIX ?? "Sony";
const SONY_CDN_DOMAIN =
  process.env.SONY_CDN_DOMAIN ?? "d398z0s4ibmzlz.cloudfront.net";

const TABLE_NAME = process.env.CMS_TABLE_NAME ?? "";
const STATE_MACHINE_ARN = process.env.VOD_STATE_MACHINE_ARN ?? "";

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sfnClient = new SFNClient({});

const SONY_MAPPING_TEMPLATE = {
  root: "//channel/item",
  nextPage: "",
  guid: "*[name()='guid']/text()",
  extId: "*[name()='guid']/text()",
  title: "title | *[name()='media:title']/text()",
  description: "description | *[name()='media:description']/text()",
  asset: "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
  subtitle: "array {}",
  thumbnails:
    "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
  pubDate: "pubDate | *[name()='airDates']/*[name()='aired']/text()",
  seasonNum: "''",
  episodeNum: "''",
  type: "movie",
  seriesId: "''",
  rotationStart:
    "if (exists(*[name()='dcterms:valid']/text()) and contains(*[name()='dcterms:valid']/text(), 'start=')) then substring-before(substring-after(*[name()='dcterms:valid']/text(), 'start='), ';') else fn:current-date()",
  rotationEnd:
    "if (exists(*[name()='dcterms:valid']/text()) and contains(*[name()='dcterms:valid']/text(), 'end=')) then substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';') else xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))",
  cast: "",
  rating: "*[name()='media:rating']/text()",
  genres: "*[name()='media:genres']/text()",
  cuePoints: "",
  seriesMainThumbnail: "map{}",
  seriesAltThumbnail: "map{}",
  seriesBackgroundThumbnail: "map{}",
  movieMainThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieAltThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieBackgroundThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  episodeMainThumbnail: "map:merge(())",
  episodeAltThumbnail: "map:merge(())",
  episodeBackgroundThumbnail: "map:merge(())",
};

interface NamedAssetItem {
  id: string;
  name: string;
  searchName?: string;
}

function buildMrssItem(asset: SonyAssetMeta): string {
  return `    <item>
      <guid isPermaLink="false">${asset.id}</guid>
      <media:title type="plain">${escapeXml(asset.title)}</media:title>
      <media:description>${escapeXml(asset.description)}</media:description>
      <pubDate>${asset.pubDate}</pubDate>
      <media:genres>${escapeXml(asset.genres)}</media:genres>
      <media:category>${escapeXml(asset.category)}</media:category>
      <media:content medium="video" duration="${asset.duration}" bitrate="38732" height="1080" width="1920" url="https://${SONY_CDN_DOMAIN}/${asset.id}/${asset.id}.mpg" />
      <media:thumbnail medium="image" height="1080" width="1920" type="image/jpg" url="https://${SONY_CDN_DOMAIN}/${asset.id}/${asset.id}_800_1200.jpg" />
      <media:rating scheme="urn:v-chip">${escapeXml(asset.rating)}</media:rating>
      <dcterms:valid>start=${asset.start};end=${asset.end};scheme=W3C-DTF</dcterms:valid>
    </item>`;
}

function escapeXml(value: string): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function findAssetIdByName(
  entityType: "PROVIDER" | "PACKAGE",
  name: string
): Promise<string> {
  const lowered = name.toLowerCase();
  const { Items } = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "#PK = :PK",
      FilterExpression: "#searchName = :name",
      ExpressionAttributeNames: {
        "#PK": "GSI1-PK",
        "#searchName": "searchName",
      },
      ExpressionAttributeValues: {
        ":PK": `ASSET#${entityType}`,
        ":name": lowered,
      },
    })
  );

  const items = (Items ?? []) as NamedAssetItem[];
  if (items.length === 0) {
    throw new Error(
      `[SONY-INGEST] No ${entityType} found with name "${name}" in table ${TABLE_NAME}`
    );
  }
  if (items.length > 1) {
    console.warn(
      `[SONY-INGEST] Multiple ${entityType}s found with name "${name}", picking first.`
    );
  }
  return items[0].id;
}

async function findAllPlatformIds(): Promise<string[]> {
  const ids: string[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "#PK = :PK",
        ExpressionAttributeNames: { "#PK": "GSI1-PK" },
        ExpressionAttributeValues: { ":PK": "ASSET#PLATFORM" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of (Items ?? []) as NamedAssetItem[]) {
      if (item.id) ids.push(item.id);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  if (ids.length === 0) {
    throw new Error(
      `[SONY-INGEST] No platforms found in table ${TABLE_NAME}`
    );
  }
  return ids;
}

function isNextMonth(asset: SonyAssetMeta, nextYear: number, nextMonth: number): boolean {
  if (!asset.start || !asset.end) return false;

  const start = new Date(asset.start);
  const end = new Date(asset.end);

  const nextMonthStart = new Date(nextYear, nextMonth - 1, 1);
  const nextMonthEnd = new Date(nextYear, nextMonth, 1);

  return start < nextMonthEnd && end > nextMonthStart;
}

async function findExistingMovieId(title: string): Promise<string | null> {
  const searchTerm = title.toLowerCase();

  let lastKey: Record<string, unknown> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "#PK = :PK",
        FilterExpression: "contains(#searchName, :title)",
        ExpressionAttributeNames: {
          "#PK": "GSI1-PK",
          "#searchName": "searchName",
        },
        ExpressionAttributeValues: {
          ":PK": "ASSET#MOVIE",
          ":title": searchTerm,
        },
        ExclusiveStartKey: lastKey,
      })
    );

    const hits = (Items ?? []) as Array<{ id: string; searchName?: string }>;
    for (const hit of hits) {
      if (hit.searchName === searchTerm) {
        return hit.id;
      }
    }

    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return null;
}

async function updateMovieDates(
  movieId: string,
  availableDate: string,
  expirationDate: string
): Promise<void> {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ASSET#MOVIE#${movieId}`,
        SK: `ASSET#MOVIE#${movieId}`,
      },
      UpdateExpression:
        "set availableDate = :availableDate, expirationDate = :expirationDate, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":availableDate": availableDate,
        ":expirationDate": expirationDate,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );
}

async function uploadMrssToS3(
  xmlContent: string,
  year: number,
  month: number
): Promise<string> {
  const monthStr = String(month).padStart(2, "0");
  const fileName = `${year}-${monthStr}.xml`;
  const s3Key = `${SONY_OUTPUT_PREFIX}/${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: SONY_BUCKET,
      Key: s3Key,
      Body: xmlContent,
      ContentType: "application/xml",
    })
  );

  console.log(`[SONY-INGEST] Uploaded MRSS feed to s3://${SONY_BUCKET}/${s3Key}`);
  return `https://${SONY_CDN_DOMAIN}/${s3Key}`;
}

interface LambdaContext {
  getRemainingTimeInMillis?: () => number;
}

export default async function handler(
  _event?: unknown,
  context?: LambdaContext
) {
  try {
    if (!TABLE_NAME) throw new Error("CMS_TABLE_NAME env var not set");
    if (!STATE_MACHINE_ARN)
      throw new Error("VOD_STATE_MACHINE_ARN env var not set");

    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;

    console.log(
      `[SONY-INGEST] Processing Sony assets for ${nextYear}-${String(nextMonth).padStart(2, "0")}`
    );
    console.log(
      `[SONY-INGEST] Resolving provider="${PROVIDER_NAME}", package="${PACKAGE_NAME}", all platforms`
    );

    const [providerId, packageId, platformIds] = await Promise.all([
      findAssetIdByName("PROVIDER", PROVIDER_NAME),
      findAssetIdByName("PACKAGE", PACKAGE_NAME),
      findAllPlatformIds(),
    ]);

    console.log(
      `[SONY-INGEST] Resolved providerId=${providerId}, packageId=${packageId}, platformIds=[${platformIds.join(",")}]`
    );

    const allGuids = await listSonyGuids();
    console.log(`[SONY-INGEST] Found ${allGuids.length} GUIDs in bucket`);

    const mrssItems: string[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    const metaByGuid = new Map<string, SonyAssetMetaResult>();
    const touchedGuids = new Set<string>();

    for (const guid of allGuids) {
      const result = await fetchAssetMeta(guid);
      metaByGuid.set(guid, result);

      if (!result.ok) {
        console.warn(`[SONY-INGEST] Skipping GUID ${guid}: ${result.reason}`);
        skippedCount++;
        continue;
      }

      const meta = result.meta;

      if (!isNextMonth(meta, nextYear, nextMonth)) {
        skippedCount++;
        continue;
      }

      const existingId = await findExistingMovieId(meta.title);

      if (existingId) {
        console.log(
          `[SONY-INGEST] Existing asset found (id=${existingId}) for title="${meta.title}" — updating dates`
        );
        await updateMovieDates(existingId, meta.start, meta.end);
        updatedCount++;
      } else {
        mrssItems.push(buildMrssItem(meta));
      }

      touchedGuids.add(guid);
    }

    console.log(
      `[SONY-INGEST] Summary: ${mrssItems.length} new items for MRSS, ${updatedCount} existing updated, ${skippedCount} skipped`
    );

    const cleanup = (submitted: boolean): Promise<SonyCleanupResult> =>
      runSonyOriginCleanup({
        guids: allGuids,
        metaByGuid,
        touchedGuids,
        keepYear: nextYear,
        keepMonth: nextMonth,
        getRemainingTimeInMillis: context?.getRemainingTimeInMillis?.bind(context),
      }).catch((err) => {
        console.error(
          `[SONY-CLEANUP] Cleanup failed after a ${submitted ? "submitted" : "no-op"} ingest:`,
          err
        );
        throw err;
      });

    if (mrssItems.length === 0) {
      console.log(
        "[SONY-INGEST] No new items to ingest. Skipping state machine execution."
      );

      let cleanupResult: SonyCleanupResult | { error: string };
      try {
        cleanupResult = await cleanup(false);
      } catch (err) {
        cleanupResult = { error: String(err) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Sony MRSS ingestion completed — no new assets to ingest",
          updatedExistingCount: updatedCount,
          skippedCount,
          cleanup: cleanupResult,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    const mrssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:xumo="http://www.xumo.com/rss/extensions/" xmlns:dcterms="http://purl.org/dc/terms/" version="2.0">
  <channel>
${mrssItems.join("\n")}
  </channel>
</rss>`;

    const mrssUrl = await uploadMrssToS3(mrssXml, nextYear, nextMonth);

    const input = {
      type: "MAP_URL",
      url: mrssUrl,
      mapping: SONY_MAPPING_TEMPLATE,
      isPrivate: false,
      provider: providerId,
      packages: [packageId],
      brands: [] as string[],
      distributors: [] as string[],
      locations: [] as string[],
      platforms: platformIds,
    };

    const executionName = `sony-ingestion-${Date.now()}`;
    console.log(
      `[SONY-INGEST] Starting state machine execution "${executionName}" against ${STATE_MACHINE_ARN}`
    );

    await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        name: executionName,
        input: JSON.stringify(input),
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Sony MRSS ingestion started successfully",
        executionName,
        mrssUrl,
        newItemCount: mrssItems.length,
        updatedExistingCount: updatedCount,
        skippedCount,
        provider: { name: PROVIDER_NAME, id: providerId },
        package: { name: PACKAGE_NAME, id: packageId },
        platformsCount: platformIds.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("[SONY-INGEST] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Sony MRSS ingestion failed",
        error: String(error),
      }),
    };
  }
}
