import moment from 'moment/moment';
import { toast } from 'react-toastify';
import handleError from '@components/commons/forms/handleError';
import handleSuccess from '@components/commons/forms/handleSuccess';
import { EPGResult } from '@entities/content/epg';
import { Epg } from '@/api';
import fileToBase64 from '@utils/fileToBase64';

export default async function updateProgram(
  finalData: any,
  epg: EPGResult,
  selectedEpgIndex: number,
  setOpen: (open: number) => void,
  refetch: () => void,
) {
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

  const updatedProgram = {
    start_time: moment.utc(`${finalData.start_date} ${finalData.start_time}`).toISOString(),
    end_time: moment.utc(`${finalData.end_date} ${finalData.end_time}`).toISOString(false),
    thumbnail: thumbnailBase64.length > 0 ? thumbnailBase64 : undefined,
    alternateThumbnail: alternateThumbnailBase64.length > 0 ? alternateThumbnailBase64 : undefined,
    archive: finalData.archive,
    catchup: finalData.catchup,
    description: finalData.description,
    duration: finalData.duration,
    ext_id: finalData.ext_id,
    rating: finalData.rating?.value || null,
    slug: finalData.slug,
    subtitle: finalData.subtitle,
    title: finalData.title,
    id: finalData.id,
  };

  try {
    if (epg?.id === undefined) {
      handleError('edit', 'EPG', 'EPG ID is undefined');
    } else {
      await Epg.updateProgram(epg.id, finalData.id, updatedProgram);
      handleSuccess(() => setOpen(-1), refetch, 'EPG', 'edit');
    }
  } catch (error: any) {
    handleError('edit', 'EPG', error?.response?.data?.error);
  }
}
