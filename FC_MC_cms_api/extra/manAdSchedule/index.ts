import { startSchedule } from "../shared/adSchedule";

const fileName = process.env.MAN_CUEPOINT_KEY || "Man/Man-channel.JSON";
const channel = process.env.MAN_CHANNEL_ID || "2097759";

export default async function handler() {
  return startSchedule({
    fileName,
    channel,
  });
}
