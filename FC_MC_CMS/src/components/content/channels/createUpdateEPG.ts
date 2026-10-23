import { AxiosResponse } from 'axios';
import { toast } from 'react-toastify';
import { Epg } from '@/api';
import fileToBase64 from '@utils/fileToBase64';
import handleError from '@components/commons/forms/handleError';
import { epgActivityLogger } from '@/activityLogger/content/channels';

function checkIfUserHasStartedToFillEpg(epg: any) {
  return !!epg?.epgTemplate
    || !!epg?.ingestionUrl
    || !!epg?.schedule
    || epg?.thumbnail?.length > 0
    || !!epg?.timezone;
}

function scheduleToCron(schedule: any) {
  const {
    type, hourlyHour, dailyHour, weeklyHour, weeklyDays,
  } = schedule;
  if (type === 'HOURLY') {
    return `0 0/${hourlyHour} ? * * *`;
  } if (type === 'DAILY') {
    const minute = dailyHour.split(':')[1];
    const hour = dailyHour.split(':')[0];
    return `${minute} ${hour} ? * * *`;
  }
  const minute = weeklyHour.split(':')[1];
  const hour = weeklyHour.split(':')[0];
  return `${minute} ${hour} ? * ${weeklyDays.join(',')} *`;
}

export default async function createUpdateEPG(
  data: any,
  action: 'add' | 'edit',
  baseData: any,
) : Promise<string | null> {
  if (!data.epg || !checkIfUserHasStartedToFillEpg(data.epg)) {
    return null;
  }
  let base64 = '';
  if (data.epg.thumbnail instanceof FileList) {
    try {
      base64 = await fileToBase64(data.epg.thumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }
  const finalData = {
    name: data.epg.name,
    ingestionUrl: data.epg.ingestionUrl,
    ingestionSchedule: scheduleToCron(data.epg.schedule),
    epgTemplate: data.epg.epgTemplate.value,
    timezone: data.epg.timezone.value,
    thumbnail: base64.length > 0 ? base64 : undefined,
    extId: data.epg.id ? undefined : data.epg.name,
  };

  try {
    if (data.epg.id) {
      await Epg.updateEpg(data.epg.id!, finalData);
      epgActivityLogger(baseData.epg, finalData);
      return data.epg.id;
    }
    const response: AxiosResponse<any> = await Epg.addEpg(finalData);
    return response.headers?.location?.split?.('/')?.pop();
  } catch (error: any) {
    handleError(action, 'Channel', error?.response?.data?.error);
    return null;
  }
}
