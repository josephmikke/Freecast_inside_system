import { toast } from 'react-toastify';
import { Vods } from '@/api';
import handleError from '@components/commons/forms/handleError';
import handleSuccess from '@components/commons/forms/handleSuccess';
import fileToBase64 from '@utils/fileToBase64';
import { vodMovieActivityLogger } from '@/activityLogger/content/vod';
import addLogger from '@/activityLogger/common/add-logger';

async function handleAddOrEditMovies(
  finalData: any,
  id: string | undefined,
  action: 'add' | 'edit',
  refetch: () => void,
  closeConfirmModal: () => void,
  baseData: any,
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
    releaseYear: finalData.releaseYear,
    availableDate: finalData.availableDate,
    expirationDate: finalData.expirationDate,
    contentData: finalData.contentData,
    imdbId: finalData.imdbId,
    tmdbId: finalData.tmdbId,
  };

  try {
    if (action === 'add') {
      await Vods.addVodMovie(dataToSend);
      await addLogger('Movie');
    } else if (action === 'edit') {
      await Vods.updateVodMovie(id!, dataToSend);
      // @ts-ignore
      vodMovieActivityLogger(baseData, dataToSend);
    }
    handleSuccess(closeConfirmModal, refetch, 'Movie', action);
  } catch (error: any) {
    handleError(action, 'Movie', error?.response?.data?.error);
  }
}

export default handleAddOrEditMovies;
