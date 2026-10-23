import { useQuery } from 'react-query';
import { api } from '@api/misc';

const getVodMovie = async (id: string) => api.get(`vod/movies/${id}`);
const getVodSerie = async (id: string) => api.get(`vod/series/${id}`);

// eslint-disable-next-line max-len
const applyFilters = (filters: any[], initialUrl: string, initialLimit: number): { url: string, limit: number } => {
  let url = initialUrl;
  let limit = initialLimit;
  filters.forEach((filter_obj) => {
    if (filter_obj.filter?.length > 0) {
      url += `&${filter_obj.query_param}=${filter_obj.filter.join(',')}`;
      limit = 150;
    }
  });
  return { url, limit };
};

const getVodsMovies = async (
  nextToken?: string,
  searchValue?: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  genres?: string[],
  active?: string,
) => {
  const defaultExclude = 'locations,streams,distributors,brands,genres,platforms,provider,packages';
  let url = 'vod/movies';

  if (nextToken) {
    url += `?nextToken=${nextToken}&exclude=${defaultExclude}`;
  } else {
    url += `?exclude=${defaultExclude}`;
  }
  let limit = 50;

  if (searchValue?.length) {
    url += `&search=${searchValue}`;
    limit = 150;
  }
  const filters = [
    { filter: categories, query_param: 'categories' },
    { filter: packages, query_param: 'packages' },
    { filter: platforms, query_param: 'platforms' },
    { filter: providers, query_param: 'providers' },
    { filter: genres, query_param: 'genres' },
  ];
  if (active?.length) {
    url += `&active=${active}`;
  }

  const result = applyFilters(filters, url, limit);
  url = result.url;
  limit = result.limit;

  if (active?.length) {
    url += `&active=${active}`;
  }
  url += `&limit=${limit}`;
  return api.get(url);
};
const getVodsSeries = async (
  nextToken?: string,
  searchValue?: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  genres?: string[],
  active?: string,
) => {
  const defaultExclude = 'locations,episodes,streams,distributors,brands,genres,platforms,provider,packages';
  let url = 'vod/series';

  if (nextToken) {
    url += `?nextToken=${nextToken}&exclude=${defaultExclude}`;
  } else {
    url += `?exclude=${defaultExclude}`;
  }
  let limit = 100;
  if (searchValue?.length) {
    url += `&search=${searchValue}`;
    limit = 150;
  }
  const filters = [
    { filter: categories, query_param: 'categories' },
    { filter: packages, query_param: 'packages' },
    { filter: platforms, query_param: 'platforms' },
    { filter: providers, query_param: 'providers' },
    { filter: genres, query_param: 'genres' },
  ];
  if (active?.length) {
    url += `&active=${active}`;
  }

  const result = applyFilters(filters, url, limit);
  url = result.url;
  limit = result.limit;

  url += `&limit=${limit}`;
  return api.get(url);
};
const addVodMovie = async (data: any) => api.post('vod/movies', data);
const addVodSerie = async (data: any) => api.post('vod/series', data);
const updateVodMovie = async (id: string, data: any) => api.patch(`vod/movies/${id}`, data);
const updateVodSerie = async (id: string, data: any) => api.patch(`vod/series/${id}`, data);
const updateEpisode = async (id: string, data: any) => api.patch(`vod/episodes/${id}`, data);
const deleteVodMovie = async (id: string) => api.delete(`vod/movies/${id}`);
const deleteVodSerie = async (id: string) => api.delete(`vod/series/${id}`);

const useVodMovie = (id: string) => useQuery(['vod/movies', { id }], () => getVodMovie(id));
const useVodSerie = (id: string) => useQuery(['vod/series', { id }], () => getVodSerie(id));

const getPackageVods = async (packageId: string, exclude: string) => api.get(`vod/movies?packages=${packageId}${exclude.length > 0 ? `&exclude=${exclude}` : ''}`);
const usePackageVods = (id: string, exclude = '') => useQuery(['vod', id], () => getPackageVods(id, exclude));

export {
  useVodMovie,
  useVodSerie,
  getVodsMovies,
  getVodsSeries,
  addVodMovie,
  addVodSerie,
  updateEpisode,
  updateVodSerie,
  updateVodMovie,
  deleteVodSerie,
  deleteVodMovie,
  usePackageVods,
};
