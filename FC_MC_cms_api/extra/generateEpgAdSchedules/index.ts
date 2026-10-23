import {
  MediaTailorClient,
  GetChannelScheduleCommand,
} from "@aws-sdk/client-mediatailor";
import { parse, addSeconds } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Builder } from "xml2js";

const mediaTailorClient = new MediaTailorClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const CONFIG = {
  generateJSON: process.env.GENERATE_JSON !== "false",
  generateXML: process.env.GENERATE_XML !== "false",
  epgDurationHours: parseInt(process.env.EPG_DURATION_HOURS || "48"),
  uploadCdnDomain:
    process.env.EPG_UPLOAD_CDN_DOMAIN || "d398z0s4ibmzlz.cloudfront.net",
  s3Prefix: process.env.S3_PREFIX || "",
};

const xmlBuilder = new Builder();

interface ChannelAsset {
  PK: string;
  title: string;
  description: string;
  cuePoints: string[];
  duration: string;
  [key: string]: unknown;
}

interface ChannelConfig {
  assets: ChannelAsset[];
  iconUrl: string;
  jsonKey: string;
  xmlKey: string;
}

interface ChannelBaseDef {
  assetsKey: string;
  iconUrl: string;
  jsonKey: string;
  xmlKey: string;
}

interface Program {
  start: string;
  stop: string;
  duration: string;
  channel: string;
  title: string;
  cuePoints: string[];
  desc: string;
  category: string;
  PK: string;
}

const CHANNEL_BASE: Record<string, ChannelBaseDef> = {
  "man-channel": {
    assetsKey: "Man/Man-Channel.json",
    iconUrl:
      "https://freecast.s3.amazonaws.com/Programming/EPG/The_Man_Channel/the-man-channel-program-image.png",
    jsonKey: "Man/Man-channel.JSON",
    xmlKey: "Man/Man-Channel.xml",
  },
  "girly-flix-channel": {
    assetsKey: "Girly-Flix/Girly-Flix-Channel.json",
    iconUrl:
      "https://freecast.s3.amazonaws.com/Programming/EPG/Chick_Flix/chick-flix-program-image.png",
    jsonKey: "Girly-Flix/Girly-Flix-Channel.JSON",
    xmlKey: "Girly-Flix/Girly-Flix-Channel.xml",
  },
};

const CHANNELS = Object.keys(CHANNEL_BASE);

const buildCdnUrl = (domain: string, key: string): string => {
  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://${normalizedDomain}/${encodedKey}`;
};

async function fetchChannelAssetsFromCdn(
  cdnDomain: string,
  objectKey: string
): Promise<ChannelAsset[]> {
  const url = buildCdnUrl(cdnDomain, objectKey);
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(
      `[EPG-GEN] Failed to fetch channel assets from CDN (${response.status} ${response.statusText}): ${url}`
    );
  }
  const parsed: unknown = JSON.parse(await response.text());
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[EPG-GEN] Channel assets JSON must be an array (key: ${objectKey})`
    );
  }
  return parsed as ChannelAsset[];
}

async function loadChannelMapFromCdn(): Promise<Record<string, ChannelConfig>> {
  const cdnDomain = process.env.EPG_ASSETS_CDN_DOMAIN?.trim();
  if (!cdnDomain) {
    throw new Error(
      "[EPG-GEN] EPG_ASSETS_CDN_DOMAIN must be set to load channel assets from CDN"
    );
  }

  const entries = await Promise.all(
    CHANNELS.map(async (channelName) => {
      const base = CHANNEL_BASE[channelName];
      const assets = await fetchChannelAssetsFromCdn(cdnDomain, base.assetsKey);
      const config: ChannelConfig = {
        assets,
        iconUrl: base.iconUrl,
        jsonKey: base.jsonKey,
        xmlKey: base.xmlKey,
      };
      return [channelName, config] as const;
    })
  );

  return Object.fromEntries(entries) as Record<string, ChannelConfig>;
}

function addDuration(dateString: string, duration: number): string {
  const dateWithoutOffset = dateString.slice(0, 14);
  const offset = dateString.slice(14);

  const date = parse(dateWithoutOffset, "yyyyMMddHHmmss", new Date());
  const newDate = addSeconds(date, duration);
  return formatInTimeZone(newDate, "UTC", "yyyyMMddHHmmss") + offset;
}

function isoToChannelFormat(isoDate: string | Date): string {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return formatInTimeZone(date, "UTC", "yyyyMMddHHmmss") + " +0000";
}

async function getCurrentProgramFromMediaTailor(channelName: string) {
  try {
    const response = await mediaTailorClient.send(
      new GetChannelScheduleCommand({
        ChannelName: channelName,
        DurationMinutes: "60",
      })
    );

    if (response.Items && response.Items.length > 0) {
      const current = response.Items[0];
      return {
        programStartTime: current.ApproximateStartTime!,
        programDuration: current.ApproximateDurationSeconds,
        programName: current.ProgramName,
        vodSourceName: current.VodSourceName,
      };
    }
  } catch (error) {
    console.error(`[EPG-GEN] Error getting schedule for channel ${channelName}:`, error);
  }
  return null;
}

function findAssetByVODSourceName(assets: ChannelAsset[], vodSourceName: string): number {
  for (let i = 0; i < assets.length; i++) {
    if (assets[i].PK && assets[i].PK.includes(vodSourceName)) {
      return i;
    }
  }
  return 0;
}

function buildProgramListFromAssets(
  assets: ChannelAsset[],
  channelName: string,
  startTime: string,
  maxDurationSeconds: number,
  startAssetIndex: number = 0
): Program[] {
  if (!assets || assets.length === 0) return [];

  let start = startTime;
  const programList: Program[] = [];
  let totalDuration = 0;
  let currentAssetIndex = startAssetIndex;
  let loopsCompleted = 0;

  while (totalDuration < maxDurationSeconds) {
    const asset = assets[currentAssetIndex];
    const assetDuration = parseInt(asset.duration);

    const cuePoints = asset.cuePoints?.map((cp) =>
      addDuration(start, parseFloat(cp))
    ) ?? [];

    const stop = addDuration(start, assetDuration);

    programList.push({
      start,
      stop,
      duration: asset.duration,
      channel: channelName,
      title: asset.title,
      cuePoints,
      desc: asset.description,
      category: channelName,
      PK: asset.PK,
    });

    start = stop;
    totalDuration += assetDuration;
    currentAssetIndex++;

    if (currentAssetIndex >= assets.length) {
      currentAssetIndex = 0;
      loopsCompleted++;
    }
    if (loopsCompleted > 10) break;
  }

  return programList;
}

function buildXML(channelName: string, programList: Program[], channelMap: Record<string, ChannelConfig>): string {
  const iconUrl = channelMap[channelName].iconUrl;

  return xmlBuilder.buildObject({
    tv: {
      programme: programList.map((program) => ({
        $: {
          start: program.start,
          stop: program.stop,
          channel: program.channel,
        },
        title: { _: program.title, $: { lang: "en" } },
        "sub-title": { _: "", $: { lang: "en" } },
        icon: { $: { src: iconUrl, width: "1920", height: "1080" } },
        desc: { _: program.desc, $: { lang: "en" } },
        category: { _: channelName, $: { lang: "en" } },
        language: { _: "English" },
        "orig-language": { _: "English" },
        date: "",
        length: [
          { _: Math.floor(parseInt(program.duration) / 60), $: { lang: "minute" } },
          { _: program.duration, $: { lang: "second" } },
        ],
      })),
    },
  });
}

async function uploadToS3(key: string, content: string, contentType: string): Promise<void> {
  const fullKey =
    (CONFIG.s3Prefix ? `${CONFIG.s3Prefix.replace(/\/$/, "")}/` : "") + key;
  const url = buildCdnUrl(CONFIG.uploadCdnDomain, fullKey);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(
      `[EPG-GEN] Failed to upload via CDN (${response.status} ${response.statusText}): ${url}`
    );
  }
  console.log(`[EPG-GEN] Uploaded via CDN: ${url}`);
}

async function getAllChannelInfo(channelMap: Record<string, ChannelConfig>): Promise<Record<string, Program[]>> {
  const allProgramLists: Record<string, Program[]> = {};
  const now = new Date();
  const currentTime = formatInTimeZone(now, "UTC", "yyyyMMddHHmmss") + " +0000";
  const maxDurationSeconds = CONFIG.epgDurationHours * 3600;

  console.log(`[EPG-GEN] Current UTC time: ${currentTime}`);
  console.log(`[EPG-GEN] Target EPG duration: ${CONFIG.epgDurationHours} hours`);

  for (const channelName of CHANNELS) {
    try {
      console.log(`[EPG-GEN] Processing channel: ${channelName}`);
      const { assets } = channelMap[channelName];

      if (!assets || assets.length === 0) {
        console.error(`[EPG-GEN] No assets for ${channelName}`);
        allProgramLists[channelName] = [];
        continue;
      }

      const currentProgramInfo = await getCurrentProgramFromMediaTailor(channelName);

      let startTime: string;
      let startAssetIndex: number;

      if (currentProgramInfo) {
        startTime = isoToChannelFormat(currentProgramInfo.programStartTime);
        startAssetIndex = findAssetByVODSourceName(
          assets,
          currentProgramInfo.vodSourceName!
        );
        console.log(
          `[EPG-GEN] Current program: ${assets[startAssetIndex].title} (PK: ${assets[startAssetIndex].PK})`
        );
        console.log(`[EPG-GEN] Program start time from MediaTailor: ${startTime}`);
      } else {
        startTime = currentTime;
        startAssetIndex = 0;
        console.log(
          `[EPG-GEN] No MediaTailor schedule, using fallback: ${assets[0].title}`
        );
      }

      const programList = buildProgramListFromAssets(
        assets,
        channelName,
        startTime,
        maxDurationSeconds,
        startAssetIndex
      );

      console.log(
        `[EPG-GEN] Generated ${programList.length} programs for ${channelName}`
      );
      allProgramLists[channelName] = programList;
    } catch (error) {
      console.error(`[EPG-GEN] Failed to process ${channelName}:`, error);
      allProgramLists[channelName] = [];
    }
  }

  return allProgramLists;
}

export default async function handler() {
  try {
    const channelMap = await loadChannelMapFromCdn();
    const programLists = await getAllChannelInfo(channelMap);

    console.log("\n[EPG-GEN] === Program Generation Summary ===");
    for (const channelName of CHANNELS) {
      const list = programLists[channelName];
      if (list && list.length > 0) {
        console.log(`[EPG-GEN] ${channelName}: ${list.length} programs, first: ${list[0].title}, start: ${list[0].start}`);
      }
    }

    console.log("\n[EPG-GEN] === Uploading to S3 ===");
    for (const channelName of CHANNELS) {
      const list = programLists[channelName];
      if (!list || list.length === 0) continue;

      const channelConfig = channelMap[channelName];

      if (CONFIG.generateJSON) {
        await uploadToS3(channelConfig.jsonKey, JSON.stringify(list, null, 2), "application/json");
      }

      if (CONFIG.generateXML) {
        const xmlContent = buildXML(channelName, list, channelMap);
        await uploadToS3(channelConfig.xmlKey, xmlContent, "application/xml");
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "EPG generation completed successfully",
        channels: CHANNELS,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("[EPG-GEN] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "EPG generation failed",
        error: String(error),
      }),
    };
  }
}
