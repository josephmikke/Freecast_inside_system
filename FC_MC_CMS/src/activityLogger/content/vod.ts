import { EpisodeResult, VodPayload, VodResult } from '@entities/content/vod';
import {
  checkArray, checkArraySet, checkArrayToString, checkCategories,
  checkEntity, checkPayloadIsDefined,
  checkSimpleValue, checkSimpleValueParseInt, checkStreams,
  checkValueLabel,
} from '@/activityLogger/common/checkers';

export function vodMovieActivityLogger(
  vodBase: VodResult,
  vodPayload: VodPayload,
) {
  const updatedFields = checkEntity(vodBase, vodPayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    provider: checkValueLabel,
    description: checkSimpleValue,
    packages: checkArray,
    brands: checkArraySet,
    tmdbId: checkSimpleValue,
    availableDate: checkSimpleValue,
    releaseYear: checkSimpleValue,
    rating: checkValueLabel,
    categories: checkCategories,
    thumbnail: checkPayloadIsDefined,
    alternateThumbnail: checkPayloadIsDefined,
    backgroundThumbnail: checkPayloadIsDefined,
    genres: checkArray,
    imdbId: checkSimpleValue,
    streams: checkStreams,
    vastId: checkSimpleValue,
    expirationDate: checkSimpleValue,
    platforms: checkArray,
    distributors: checkArrayToString,
    locations: checkArray,
    contentData: checkSimpleValue,
  });

  console.log(updatedFields);
}

export function vodSerieActivityLogger(
  vodBase: VodResult,
  vodPayload: VodPayload,
) {
  const updatedFields = checkEntity(vodBase, vodPayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    provider: checkValueLabel,
    description: checkSimpleValue,
    packages: checkArray,
    brands: checkArraySet,
    tmdbId: checkSimpleValue,
    availableDate: checkSimpleValue,
    releaseYear: checkSimpleValue,
    rating: checkValueLabel,
    categories: checkCategories,
    thumbnail: checkPayloadIsDefined,
    alternateThumbnail: checkPayloadIsDefined,
    backgroundThumbnail: checkPayloadIsDefined,
    genres: checkArray,
    imdbId: checkSimpleValue,
    vastId: checkSimpleValue,
    expirationDate: checkSimpleValue,
    platforms: checkArray,
    distributors: checkArrayToString,
    locations: checkArray,
    contentData: checkSimpleValue,
  });

  console.log(updatedFields);
}

export function vodEpisodeActivityLogger(
  episodeBase: EpisodeResult,
  episodePayload: VodPayload,
) {
  const updatedFields = checkEntity(episodeBase, episodePayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    availableDate: checkSimpleValue,
    originalAirDate: checkSimpleValue,
    season: checkSimpleValueParseInt,
    expirationDate: checkSimpleValue,
    rating: checkValueLabel,
    number: checkSimpleValue,
    duration: checkSimpleValue,
    streams: checkStreams,
    description: checkSimpleValue,
    contentData: checkSimpleValue,
    thumbnail: checkPayloadIsDefined,
    alternateThumbnail: checkPayloadIsDefined,
  });

  console.log(updatedFields);
}
