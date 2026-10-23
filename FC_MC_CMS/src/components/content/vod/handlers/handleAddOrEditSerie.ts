import { toast } from 'react-toastify';
import { Vods } from '@/api';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import fileToBase64 from '@utils/fileToBase64';
import { vodSerieActivityLogger } from '@/activityLogger/content/vod';
import addLogger from '@/activityLogger/common/add-logger';

async function handleAddOrEditSeries(
  finalData: any,
  id: string | undefined,
  action: 'add' | 'edit',
  refetch: () => void,
  closeConfirmModal: () => void,
  data: any,
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
  if (finalData.alternateThumbnail
      && finalData.alternateThumbnail.length > 0
      && finalData.alternateThumbnail instanceof FileList) {
    try {
      alternateThumbnailBase64 = await fileToBase64(finalData.alternateThumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }

  let backgroundThumbnailBase64 = '';
  if (finalData.backgroundThumbnail instanceof FileList) {
    try {
      backgroundThumbnailBase64 = await fileToBase64(finalData.backgroundThumbnail[0]);
    } catch (error) {
      toast.error('Error while converting thumbnail to base64');
    }
  }

  let brandsToSend: string[] = [];

  if (finalData.brands?.length > 0) {
    // @ts-ignore
    brandsToSend = [...(new Set<string>(finalData.brands?.map((b: any) => b.value)))];
  }

  const dataToSend = {
    thumbnail: thumbnailBase64.length > 0 ? thumbnailBase64 : undefined,
    alternateThumbnail: alternateThumbnailBase64.length > 0 ? alternateThumbnailBase64 : undefined,
    backgroundThumbnail:
      backgroundThumbnailBase64.length > 0 ? backgroundThumbnailBase64 : undefined,
    name: finalData.name,
    slug: finalData.slug,
    description: finalData.description,
    vastId: finalData.vastId,
    packages: finalData?.packages?.map((pkg: any) => pkg.value) ?? [],
    platforms: finalData?.platforms?.map((pltfrm: any) => pltfrm.value) ?? [],
    categories: finalData?.categories?.map((cat: any) => ({
      id: cat.value,
      weight: cat.weight,
    })) ?? undefined,
    provider: finalData.provider.value,
    rating: finalData.rating.value,
    brands: brandsToSend,
    genres: finalData.genres?.map((g: any) => g.value) ?? [],
    locations: finalData?.locations?.map((l: any) => l.value) ?? [],
    distributors: finalData?.distributors?.map((d: any) => d.value) ?? [],
    releaseYear: finalData.releaseYear,
    availableDate: finalData.availableDate,
    expirationDate: finalData.expirationDate,
    contentData: finalData.contentData,
    imdbId: finalData.imdbId,
    tmdbId: finalData.tmdbId,
  };

  try {
    if (action === 'add') {
      await Vods.addVodSerie(dataToSend);
      await addLogger('Show');
    } else if (action === 'edit') {
      await Vods.updateVodSerie(id!, dataToSend);
      // @ts-ignore
      vodSerieActivityLogger(data, dataToSend);
    }
    handleSuccess(closeConfirmModal, refetch, 'Show', action);
  } catch (error: any) {
    handleError(action, 'Show', error?.response?.data?.error);
  }
}

export default handleAddOrEditSeries;
