import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const PROVIDER_NAME = process.env.REELZ_PROVIDER_NAME ?? "Reelz";
const PACKAGE_NAME = process.env.REELZ_PACKAGE_NAME ?? "Value Channels";
const MRSS_URL =
  process.env.REELZ_MRSS_URL ??
  "https://reelz-mrss.s3.amazonaws.com/Reelz_MRSS_Freecast.xml";

const TABLE_NAME = process.env.CMS_TABLE_NAME ?? "";
const STATE_MACHINE_ARN = process.env.VOD_STATE_MACHINE_ARN ?? "";

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sfnClient = new SFNClient({});

const REELZ_MAPPING_TEMPLATE = {
  root: "//channel/item",
  nextPage: "",
  guid: "*[name()='guid']/text()",
  extId: "*[name()='guid']/text()",
  title: "title | *[name()='media:title']/text()",
  description: "description | *[name()='media:description']/text()",
  asset:
    "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
  subtitle:
    "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
  thumbnails:
    "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
  pubDate: "pubDate",
  seasonNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
  episodeNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
  type: "*[name()='xumo:episodic']/@type",
  seriesId:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
  rotationStart:
    "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
  rotationEnd:
    "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
  rating: "*[name()='media:rating']/text()",
  cast: "",
  genres: "string-join(*[name()='media:category']/text(), ', ')",
  cuePoints:
    "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
  seriesMainThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  seriesAltThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  seriesBackgroundThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  movieMainThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieAltThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieBackgroundThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  episodeMainThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  episodeAltThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
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
      `[REELZ-INGEST] No ${entityType} found with name "${name}" in table ${TABLE_NAME}`
    );
  }
  if (items.length > 1) {
    console.warn(
      `[REELZ-INGEST] Multiple ${entityType}s found with name "${name}", picking first.`
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
      `[REELZ-INGEST] No platforms found in table ${TABLE_NAME}`
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
      `[REELZ-INGEST] Resolving provider="${PROVIDER_NAME}", package="${PACKAGE_NAME}", all platforms`
    );

    const [providerId, packageId, platformIds] = await Promise.all([
      findAssetIdByName("PROVIDER", PROVIDER_NAME),
      findAssetIdByName("PACKAGE", PACKAGE_NAME),
      findAllPlatformIds(),
    ]);

    console.log(
      `[REELZ-INGEST] Resolved providerId=${providerId}, packageId=${packageId}, platformIds=[${platformIds.join(",")}]`
    );

    const input = {
      type: "MAP_URL",
      url: MRSS_URL,
      mapping: REELZ_MAPPING_TEMPLATE,
      isPrivate: false,
      provider: providerId,
      packages: [packageId],
      brands: [] as string[],
      distributors: [] as string[],
      locations: [] as string[],
      platforms: platformIds,
    };

    const executionName = `reelz-ingestion-${Date.now()}`;
    console.log(
      `[REELZ-INGEST] Starting state machine execution "${executionName}" against ${STATE_MACHINE_ARN}`
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
        message: "Reelz MRSS ingestion started successfully",
        executionName,
        url: MRSS_URL,
        provider: { name: PROVIDER_NAME, id: providerId },
        package: { name: PACKAGE_NAME, id: packageId },
        platformsCount: platformIds.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("[REELZ-INGEST] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Reelz MRSS ingestion failed",
        error: String(error),
      }),
    };
  }
}
