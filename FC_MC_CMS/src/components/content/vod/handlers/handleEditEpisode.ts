import { toast } from 'react-toastify';
import { Vods } from '@/api';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import { vodEpisodeActivityLogger } from '@/activityLogger/content/vod';
import fileToBase64 from '@utils/fileToBase64';

async function handleEditEpisode(
  finalData: any,
  id: string,
  onDone: () => void,
  refetch: () => void,
  data: any,
): Promise<void> {
  let thumbnailBase64 = '';
  if (finalData.thumbnail instanceof FileList) {
    try {
      thumbnailBase64 = await fileToBase64(finalData.thumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }

  let alternateThumbnailBase64 = '';
  if (finalData.alternateThumbnail instanceof FileList) {
    try {
      alternateThumbnailBase64 = await fileToBase64(finalData.alternateThumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }

  const dataToSend = {
    name: finalData?.name,
    slug: finalData?.slug,
    season: finalData?.season,
    number: finalData?.number,
    duration: finalData?.duration,
    description: finalData?.description,
    rating: finalData?.rating?.value,
    thumbnail: thumbnailBase64.length > 0 ? thumbnailBase64 : undefined,
    alternateThumbnail: alternateThumbnailBase64.length > 0 ? alternateThumbnailBase64 : undefined,
    contentData: finalData?.contentData,
    originalAirDate: finalData?.originalAirDate,
    availableDate: finalData?.availableDate,
    expirationDate: finalData?.expirationDate,
    streams: finalData?.streams?.map((stream: any) => ({
      id: stream.id,
      name: stream.name,
      extId: stream.name,
      data: stream.data,
      daiParams: stream.daiParams,
      weight: stream.weight,
      enabled: stream.enabled,
      type: stream.type?.value,
      format: stream.format?.value,
    })) ?? [],
  };

  try {
    await Vods.updateEpisode(id, dataToSend);
    handleSuccess(onDone, refetch, 'Episode', 'edit');
    // @ts-ignore
    vodEpisodeActivityLogger(data, dataToSend);
  } catch (error: any) {
    handleError('edit', 'Episode', error?.response?.data?.error);
  }
}

export default handleEditEpisode;
