import { ChannelResult } from '@entities/content/channel';
import {
  checkArray, checkArraySet, checkArrayToString, checkCategories,
  checkEntity,
  checkPayloadIsDefined,
  checkSimpleValue, checkStreams, checkValueLabel,
} from '@/activityLogger/common/checkers';
import { EPGResult } from '@entities/content/epg';

function checkNumberString(old: any, updated: any) {
  if (typeof old === 'string') {
    return parseInt(old, 10) !== updated;
  }

  if (typeof updated === 'string') {
    return old !== parseInt(updated, 10);
  }
  return false;
}

export default function channelsActivityLogger(
  channelBase: ChannelResult,
  channelPayload: any,
) {
  const updatedFields = checkEntity(channelBase, channelPayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    lcn: checkNumberString,
    vastId: checkSimpleValue,
    rating: checkValueLabel,
    description: checkSimpleValue,
    visible: checkSimpleValue,
    catchUpActive: checkSimpleValue,
    availableDate: checkSimpleValue,
    expirationDate: checkSimpleValue,
    mediapackageId: checkSimpleValue,
    thumbnail: checkPayloadIsDefined,
    provider: checkValueLabel,
    platforms: checkArray,
    categories: checkCategories,
    packages: checkArray,
    genres: checkArray,
    locations: checkArray,
    streams: checkStreams,
    distributors: checkArrayToString,
    brands: checkArraySet,
  });

  console.log(updatedFields);
}

export function epgActivityLogger(
  epgBase: EPGResult,
  epgPayload: any,
) {
  // TODO : Program, need to be checked
  const updatedFields = checkEntity(epgBase, epgPayload, {
    name: checkSimpleValue,
    epgTemplate: checkValueLabel,
    ingestionSchedule: checkSimpleValue,
    ingestionUrl: checkSimpleValue,
    thumbnail: checkPayloadIsDefined,
    timezone: checkValueLabel,
  });

  console.log(updatedFields);
}
