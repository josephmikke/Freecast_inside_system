import React from 'react';
import { useParams } from 'react-router-dom';
import { Content } from '@components/index';
import { VodResult } from '@entities/content/vod';
import { useVodSerie } from '@api/vods';
import CustomLoader from '@components/commons/CustomLoader';
import { mapVodSerieToIem } from '@entities/content/mapVod';

export default function VodFormEditSerie() {
  const { id } = useParams();
  const { data: serie, refetch: refetchSerie, isFetching: isFetchingSerie } = useVodSerie(id!);

  let itemSerie: VodResult | undefined;

  if (serie && serie.data) {
    // @ts-ignore
    itemSerie = mapVodSerieToIem(serie.data);
  }

  return (
    <>
      {isFetchingSerie && (
        <div className="top-0 left-0 w-[100vw] h-[100vh] absolute">
          <CustomLoader />
        </div>
      )}
      <Content.VodForm action="edit" refetch={refetchSerie} data={itemSerie} id={id} />
    </>
  );
}
