import React from 'react';
import { useParams } from 'react-router-dom';
import { Content } from '@components/index';
import { VodResult } from '@entities/content/vod';
import { useVodMovie } from '@api/vods';
import CustomLoader from '@components/commons/CustomLoader';
import { mapVodMovieToItem } from '@entities/content/mapVod';

export default function VodFormEditMovie() {
  const { id } = useParams();
  const { data: movie, refetch: refetchMovie, isFetching: isFetchingMovie } = useVodMovie(id!);

  let itemMovie: VodResult | undefined;

  if (movie && movie.data) {
    // @ts-ignore
    itemMovie = mapVodMovieToItem(movie.data);
  }

  return (
    <>
      {isFetchingMovie && (
      <div className="top-0 left-0 w-[100vw] h-[100vh] absolute">
        <CustomLoader />
      </div>
      )}
      <Content.VodForm action="edit" refetch={refetchMovie} data={itemMovie} id={id} />
    </>
  );
}
