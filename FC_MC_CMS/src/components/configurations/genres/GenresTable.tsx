import React from 'react';
import { Genres } from '@api/index';
import CustomTable from '@components/commons/tables/CustomTable';
import useGenresColumns from '@components/configurations/genres/useGenresColumns';

interface GenresTableProps {
  refetch: () => void;
  data: any;
}

export default function GenresTable({ refetch, data }: GenresTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useGenresColumns}
      getEditPath={(id: string) => `/configurations/genres/${id}/edit`}
      deleteEntity={Genres.deleteGenre}
      updateEntity={Genres.updateGenre}
      updateWeightEntity={Genres.updateWeightGenre}
      entityName="Genre"
      isDraggable
    />
  );
}
