import { toast } from 'react-toastify';
import fileToBase64 from '@utils/fileToBase64';
import { Channels } from '@/api';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import channelsActivityLogger from '@/activityLogger/content/channels';
import addLogger from '@/activityLogger/common/add-logger';

export default async function createUpdateChannel(
  data: any,
  action: 'add' | 'edit',
  id: string | undefined,
  goBack: () => void,
  refetch: () => void,
  epgId: string | null,
  baseData: any,
) {
  let base64 = '';
  if (data.thumbnail instanceof FileList) {
    try {
      base64 = await fileToBase64(data.thumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }

  let finalBrands: string[] = [];

  if (data.brands?.length > 0) {
    // @ts-ignore
    finalBrands = [...(new Set<string>(data.brands?.map((b: any) => b.value)))];
  }

  const finalData = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    lcn: data.lcn,
    vastId: data.vastId,
    rating: data.rating.value,
    visible: data.visible,
    epg: epgId || undefined,
    catchUpActive: data.catchUpActive,
    availableDate: data.availableDate,
    expirationDate: data.expirationDate,
    provider: data.provider.value,
    categories: data.categories?.map((c: any) => ({ id: c.value, weight: c.weight || data.lcn }))
      || [],
    packages: data.packages?.map((p: any) => p.value) || [],
    brands: finalBrands,
    mediapackageId: data.mediapackageId,
    streams: data.streams?.map((stream: any) => ({
      name: stream.name,
      data: stream.data,
      daiParams: stream.daiParams,
      weight: stream.weight,
      enabled: stream.enabled,
      type: stream.type?.value,
      format: stream.format?.value,
    })) || [],
    platforms: data.platforms?.map((p: any) => p.value) || [],
    genres: data.genres?.map((g: any) => g.value) || [],
    locations: data.locations?.map((l: any) => l.value) || undefined,
    distributors: data.distributors?.map((d: any) => d.value) || undefined,
    thumbnail: base64.length > 0 ? base64 : undefined,
  };

  try {
    if (action === 'edit') {
      await Channels.updateChannel(id!, finalData);
      channelsActivityLogger(baseData, finalData);
    } else {
      await Channels.addChannel({
        ...finalData,
        epg: epgId,
      });
      await addLogger('Channel');
    }
    handleSuccess(goBack, refetch, 'Channel', action);
    return true;
  } catch (error: any) {
    handleError(action, 'Channel', error?.response?.data?.error);
    return false;
  }
}
