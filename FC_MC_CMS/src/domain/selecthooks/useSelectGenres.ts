import { useMemo } from 'react';
import { Genres } from '@api/index';
import { GenreResult } from '@entities/configurations/genre';

interface UseSelectGenresReturn {
  genres: { label: string, value: string, weight: number }[];
  genresIsFetching: boolean;
}

export default function useSelectGenres(): UseSelectGenresReturn {
  const {
    data: genresData,
    error: genresError,
    isFetching: genresIsFetching,
  } = Genres.useGenres();

  return useMemo<UseSelectGenresReturn>(
    () => {
      if (!genresData?.data?.genres || genresError || genresIsFetching) {
        return { genres: [], genresIsFetching };
      }
      return {
        genres: genresData?.data?.genres
          ?.filter((genre: GenreResult) => genre.enabled)
          ?.map((genre: GenreResult) => ({
            label: genre.name, value: genre.id,
          })),
        genresIsFetching,
      };
    },
    [genresError, genresData, genresIsFetching],
  );
}
