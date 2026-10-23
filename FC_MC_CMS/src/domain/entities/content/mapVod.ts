import moment from 'moment';
import getLabel from '@utils/getLabel';
import { StreamsFormatValues, StreamTypesValues } from '@entities/content/stream';
import { VodResult } from '@entities/content/vod';

function formatDuration(duration: string | undefined) {
  if (duration) {
    const momentDuration = moment.duration(duration, 'minutes');
    const hours = momentDuration.hours() < 10 ? `0${momentDuration.hours()}` : momentDuration.hours();
    const minutes = momentDuration.minutes() < 10 ? `0${momentDuration.minutes()}` : momentDuration.minutes();
    const seconds = momentDuration.seconds() < 10 ? `0${momentDuration.seconds()}` : momentDuration.seconds();
    return `${hours}:${minutes}:${seconds}`;
  }
  return '';
}

function formatToJsonField(json: string | undefined | null) {
  try {
    return JSON.stringify(JSON.parse(json ?? '{}'), null, 4);
  } catch (error) {
    return json;
  }
}

export function mapVodMovieToItem(movie: VodResult) {
  return {
    ...movie,
    rating: { value: movie.rating, label: movie.rating },
    packages: movie.packages?.map((pkg) => ({ label: pkg.name, value: pkg.id })) || [],
    categories: movie.categories ? movie.categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })) : [],
    distributors: movie.distributors.map((dist) => ({ label: dist.name, value: dist.id })),
    locations: movie.locations.map((loc) => ({ label: loc.name, value: loc.id })),
    brands: movie.brands.map((brand) => ({ label: brand.name, value: brand.siteId })),
    provider: movie.provider ? { label: movie.provider.name, value: movie.provider.id } : undefined,
    platforms: movie.platforms.map((platform) => ({
      label: platform.name, value: platform.id,
    })),
    streams: movie.streams.map((stream) => ({
      ...stream,
      format: { value: stream.format, label: getLabel(stream.format, StreamsFormatValues) },
      type: { value: stream.type, label: getLabel(stream.type, StreamTypesValues) },
    })),
    genres: movie.genres.map((genre) => ({ label: genre.name, value: genre.id })),
    contentData: formatToJsonField(movie.contentData),
    availableDate: moment(new Date(movie.availableDate)).format(('yyyy-MM-DD')),
    expirationDate: movie.expirationDate ? moment(new Date(movie.expirationDate)).format(('yyyy-MM-DD')) : null,
    releaseYear: movie.releaseYear ? moment(new Date(movie.releaseYear)).format(('yyyy')) : null,
  };
}

export function mapVodsMoviesToItems(movies: VodResult[]) {
  return movies.map((movie) => ({
    ...movie,
    rating: { value: movie.rating, label: movie.rating },
    packages: movie.packages?.map((pkg) => ({ label: pkg.name, value: pkg.id })) || [],
    categories: movie.categories ? movie.categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })) : [],
    provider: movie.provider ? { label: movie.provider.name, value: movie.provider.id } : undefined,
    genres: movie.genres?.map((genre) => ({ label: genre.name, value: genre.id })) || [],
    platforms: movie.platforms?.map((platform) => ({
      label: platform.name, value: platform.id,
    })) || [],
    contentData: formatToJsonField(movie.contentData),
    availableDate: moment(new Date(movie.availableDate)).format(('yyyy-MM-DD')),
    expirationDate: movie.expirationDate ? moment(new Date(movie.expirationDate)).format(('yyyy-MM-DD')) : null,
  }));
}

export function mapVodSerieToIem(serie: VodResult) {
  return {
    ...serie,
    rating: { value: serie.rating, label: serie.rating },
    packages: serie.packages?.map((pkg) => ({ label: pkg.name, value: pkg.id })) || [],
    categories: serie.categories ? serie.categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })) : [],
    distributors: serie.distributors.map((dist) => ({ label: dist.name, value: dist.id })),
    locations: serie.locations.map((loc) => ({ label: loc.name, value: loc.id })),
    brands: serie.brands.map((brand) => ({ label: brand.name, value: brand.siteId })),
    genres: serie.genres.map((genre) => ({ label: genre.name, value: genre.id })),
    provider: serie?.provider
      ? { label: serie?.provider?.name, value: serie?.provider?.id } : undefined,
    platforms: serie.platforms.map((platform) => ({
      label: platform.name, value: platform.id,
    })),
    contentData: formatToJsonField(serie.contentData),
    episodes: serie.episodes.map((episode) => ({
      ...episode,
      rating: { value: episode.rating, label: episode.rating },
      duration: formatDuration(episode.duration),
      contentData: formatToJsonField(episode.contentData),
      streams: episode.streams.map((stream) => ({
        ...stream,
        format: { value: stream.format, label: getLabel(stream.format, StreamsFormatValues) },
        type: { value: stream.type, label: getLabel(stream.type, StreamTypesValues) },
      })),
      availableDate: moment(new Date(episode.availableDate)).format(('yyyy-MM-DD')),
      expirationDate: episode.expirationDate ? moment(new Date(episode.expirationDate))
        .format(('yyyy-MM-DD')) : null,
      originalAirDate: episode.originalAirDate ? moment(new Date(episode.originalAirDate))
        .format(('yyyy-MM-DD')) : null,
    })) ?? [],
    availableDate: moment(new Date(serie.availableDate)).format(('yyyy-MM-DD')),
    expirationDate: serie.expirationDate ? moment(new Date(serie.expirationDate)).format(('yyyy-MM-DD')) : null,
    releaseYear: serie.releaseYear ? moment(new Date(serie.releaseYear)).format(('yyyy')) : null,
  };
}

export function mapVodsSeriesToItems(series: VodResult[]) {
  return series.map((serie) => ({
    ...serie,
    rating: { value: serie.rating, label: serie.rating },
    packages: serie.packages?.map((pkg) => ({ label: pkg.name, value: pkg.id })) || [],
    categories: serie.categories ? serie.categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })) : [],
    provider: serie?.provider
      ? { label: serie?.provider?.name, value: serie?.provider?.id } : undefined,
    platforms: serie.platforms?.map((platform) => ({
      label: platform.name, value: platform.id,
    })) || [],
    availableDate: moment(new Date(serie.availableDate)).format(('yyyy-MM-DD')),
    expirationDate: serie.expirationDate ? moment(new Date(serie.expirationDate)).format(('yyyy-MM-DD')) : null,
  }));
}
