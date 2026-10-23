import {
  MediaLiveClient,
  BatchUpdateScheduleCommand,
  DeleteScheduleCommand,
  type ScheduleAction,
} from "@aws-sdk/client-medialive";

const medialive = new MediaLiveClient({ region: "us-east-1" });

const eventID = 1001;
const duration = 5400000;

interface CuePointEntry {
  cuePoints: string[];
}

const parseCustomDateString = (dateString: string): Date => {
  const [datePart] = dateString.split(" ");

  const year = parseInt(datePart.substring(0, 4), 10);
  const month = parseInt(datePart.substring(4, 6), 10) - 1;
  const day = parseInt(datePart.substring(6, 8), 10);
  const hours = parseInt(datePart.substring(8, 10), 10);
  const minutes = parseInt(datePart.substring(10, 12), 10);
  const seconds = parseInt(datePart.substring(12, 14), 10);

  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
};

const splice_insert = (scheduleDate: string): ScheduleAction => {
  const actualStartTime = parseCustomDateString(scheduleDate);
  const actualStartTimeStr = actualStartTime.toISOString();
  console.log(actualStartTimeStr);

  const action: ScheduleAction = {
    ActionName: `splice_insert.${actualStartTimeStr}`,
    ScheduleActionSettings: {
      Scte35SpliceInsertSettings: {
        SpliceEventId: eventID,
        Duration: duration,
      },
    },
    ScheduleActionStartSettings: {
      FixedModeScheduleActionStartSettings: {
        Time: actualStartTimeStr,
      },
    },
  };
  return action;
};

const scheduler = async (
  channel: string,
  scheduleDate: string
): Promise<void> => {
  const action = splice_insert(scheduleDate);
  try {
    const response = await medialive.send(
      new BatchUpdateScheduleCommand({
        ChannelId: channel,
        Creates: { ScheduleActions: [action] },
      })
    );

    console.log("MediaLive schedule response: ");
    console.log(JSON.stringify(response));
    console.log("===================  Done =============== ");
  } catch (error) {
    console.error("Error creating Schedule Action");
    console.error(error);
    throw error;
  }
};

async function deleteChannelSchedule(channelId: string): Promise<void> {
  const params = { ChannelId: channelId };

  try {
    const data = await medialive.send(new DeleteScheduleCommand(params));
    console.log(
      `Schedule for channel ${channelId} deleted successfully:`,
      data
    );
  } catch (error) {
    console.error(
      `Error deleting schedule for channel ${channelId}:`,
      error
    );
  }
}

const buildCdnUrl = (domain: string, key: string): string => {
  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://${normalizedDomain}/${encodedKey}`;
};

const parseCuePointsFromFile = async (
  fileName: string,
  channel: string
): Promise<void> => {
  const cdnDomain =
    process.env.AD_SCHEDULE_CDN_DOMAIN || "d398z0s4ibmzlz.cloudfront.net";
  const url = buildCdnUrl(cdnDomain, fileName);
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch cuepoint file from CDN (${response.status} ${response.statusText}): ${url}`
    );
  }

  const jsonContent = await response.text();

  try {
    const inputData: CuePointEntry[] = JSON.parse(jsonContent);
    const currentDate = new Date();
    const destinateDate = new Date(
      currentDate.getTime() + 24 * 60 * 60 * 1000
    );

    for (let index = 0; index < inputData.length; index++) {
      const cuePoints = inputData[index].cuePoints;

      for (let i = 0; i < cuePoints.length; i++) {
        console.log(cuePoints[i]);
        const parsedDate = parseCustomDateString(cuePoints[i]);
        if (currentDate < parsedDate && parsedDate < destinateDate) {
          await scheduler(channel, cuePoints[i]);
        }
        else console.log("============= Can not schedules ============= ");
      }
    }
  } catch (parseError) {
    console.error("Error parsing JSON:", parseError);
  }
};

export interface AdScheduleConfig {
  fileName: string;
  channel: string;
}

export const startSchedule = async (
  config: AdScheduleConfig
): Promise<{ statusCode: number; body: string }> => {
  try {
    await deleteChannelSchedule(config.channel);
    await parseCuePointsFromFile(
      config.fileName,
      config.channel
    );

    console.log("serverless function is successfully");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Ad schedule completed" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Ad schedule failed",
        error: String(error),
      }),
    };
  }
};
