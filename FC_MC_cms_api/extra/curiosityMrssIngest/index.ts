import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const PROVIDER_NAME = process.env.CURIOSITY_PROVIDER_NAME ?? "Curiosity Stream";
const PACKAGE_NAME = process.env.CURIOSITY_PACKAGE_NAME ?? "Curiosity Stream";
const MRSS_URL =
  process.env.CURIOSITY_MRSS_URL ?? "https://cdn.curiositystream.com/universalsearch/freecast/cbe5306f-0ab3-4588-9f8f-4871fd78f49e/feed.xml";

const TABLE_NAME = process.env.CMS_TABLE_NAME ?? "";
const STATE_MACHINE_ARN = process.env.VOD_STATE_MACHINE_ARN ?? "";

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sfnClient = new SFNClient({});

const CURIOSITY_MAPPING_TEMPLATE = {
  root: "//channel/item",
  nextPage: "",
  guid: "concat(*[name()='guid']/text(), '-curiosity')",
  extId: "concat(*[name()='guid']/text(), '-curiosity')",
  title: "*[name()='title']/text()",
  description: "*[name()='description']/text()",
  asset:
    "if (not(exists(*[name()='xumo:episodic'][@type='series']))) then *[name()='media:group']/*[name()='media:content'] ! map:merge(((@duration|@url) ! map{local-name(): string()}, map{'type': string(@medium), 'height': '1920', 'width': '1080'})) else map:merge(())",
  subtitle:
    "if (*[name()='xumo:episodic'][@type='series']) then array {} else array { *[name()='media:group']/*[name()='media:content']/*[name()='media:text'] ! map:merge((map{'type': string(@type), 'lang': string(@lang), 'href': string(@url)}))}",
  thumbnails:
    "if (not(exists(*[name()='xumo:episodic'][@type='series']))) then array { *[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})} else array { *[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
  pubDate: "pubDate",
  seasonNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
  episodeNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
  type: "*[name()='xumo:episodic']/@type",
  seriesId:
    "if (*[name()='xumo:episodic'][@type='episode']) then concat(*[name()='xumo:episodic']/*[name()='xumo:seriesId']/text(), '-curiosity') else ''",
  rotationStart: "*[name()='rotationStartDate']/text()",
  rotationEnd:
    "if (exists(rotationEndDate)) then (*[name()='rotationEndDate']/text()) else *[name()='rotationStartDate']/text() ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))",
  rating:
    "if (*[name()='media:rating'][@scheme='urn:simple']) then *[name()='media:rating']/text() else 'NOT_RATED'",
  cast: "",
  genres: "*[name()='media:keywords']/text()",
  cuePoints: "",
  seriesMainThumbnail:
    "*[name()='media:group']/*[name()='media:thumbnail'][1] ! map:merge((@height|@width|@url) ! map{local-name(): string()})",
  seriesAltThumbnail:
    "*[name()='media:group']/*[name()='media:thumbnail'][2] ! map:merge((@height|@width|@url) ! map{local-name(): string()})",
  seriesBackgroundThumbnail:
    "*[name()='media:group']/*[name()='media:thumbnail'][1] ! map:merge((@height|@width|@url) ! map{local-name(): string()})",
  episodeMainThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'][1] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  episodeAltThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'][2] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  movieMainThumbnail:
    "if (not(exists(*[name()='xumo:episodic']))) then (*[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'][2] ! map:merge((@height|@width|@url) ! map{local-name(): string()})) else ()",
  movieAltThumbnail:
    "if (not(exists(*[name()='xumo:episodic']))) then (*[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'][1] ! map:merge((@height|@width|@url) ! map{local-name(): string()})) else ()",
  movieBackgroundThumbnail:
    "if (not(exists(*[name()='xumo:episodic']))) then (*[name()='media:group']/*[name()='media:content']/*[name()='media:thumbnail'][1] ! map:merge((@height|@width|@url) ! map{local-name(): string()})) else ()",
};

interface NamedAssetItem {
  id: string;
  name: string;
  searchName?: string;
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
      `[CURIOSITY-INGEST] No ${entityType} found with name "${name}" in table ${TABLE_NAME}`
    );
  }
  if (items.length > 1) {
    console.warn(
      `[CURIOSITY-INGEST] Multiple ${entityType}s found with name "${name}", picking first.`
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
      `[CURIOSITY-INGEST] No platforms found in table ${TABLE_NAME}`
    );
  }
  return ids;
}

export default async function handler() {
  try {
    if (!TABLE_NAME) throw new Error("CMS_TABLE_NAME env var not set");
    if (!STATE_MACHINE_ARN)
      throw new Error("VOD_STATE_MACHINE_ARN env var not set");

    console.log(
      `[CURIOSITY-INGEST] Resolving provider="${PROVIDER_NAME}", package="${PACKAGE_NAME}", all platforms`
    );

    const [providerId, packageId, platformIds] = await Promise.all([
      findAssetIdByName("PROVIDER", PROVIDER_NAME),
      findAssetIdByName("PACKAGE", PACKAGE_NAME),
      findAllPlatformIds(),
    ]);

    console.log(
      `[CURIOSITY-INGEST] Resolved providerId=${providerId}, packageId=${packageId}, platformIds=[${platformIds.join(",")}]`
    );

    const input = {
      type: "MAP_URL",
      url: MRSS_URL,
      mapping: CURIOSITY_MAPPING_TEMPLATE,
      isPrivate: false,
      provider: providerId,
      packages: [packageId],
      brands: [] as string[],
      distributors: [] as string[],
      locations: [] as string[],
      platforms: platformIds,
    };

    const executionName = `curiosity-ingestion-${Date.now()}`;
    console.log(
      `[CURIOSITY-INGEST] Starting state machine execution "${executionName}" against ${STATE_MACHINE_ARN}`
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
        message: "Curiosity MRSS ingestion started successfully",
        executionName,
        url: MRSS_URL,
        provider: { name: PROVIDER_NAME, id: providerId },
        package: { name: PACKAGE_NAME, id: packageId },
        platformsCount: platformIds.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("[CURIOSITY-INGEST] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Curiosity MRSS ingestion failed",
        error: String(error),
      }),
    };
  }
}
