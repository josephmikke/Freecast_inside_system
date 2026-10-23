import { startSchedule } from "../shared/adSchedule";

const fileName =
  process.env.GIRLY_FLIX_CUEPOINT_KEY || "Girly-Flix/Girly-Flix-Channel.JSON";
const channel = process.env.GIRLY_FLIX_CHANNEL_ID || "6938057";

export default async function handler() {
  return startSchedule({
    fileName,
    channel,
  });
}
