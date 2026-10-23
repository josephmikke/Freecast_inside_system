import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Genres } from '@api/index';
import { Configurations } from '@components/index';
import { GenreResult } from '@entities/configurations/genre';

interface GenresPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function GenresPage({ action }: GenresPageProps) {
  return (
    <EntityModalFormTablePage<GenreResult>
      action={action}
      useData={Genres.useGenres}
      title="Genres"
      desc="List of Genres that can be used across most areas of the CMS."
      Form={Configurations.GenreForm}
      Table={Configurations.GenresTable}
      dataFieldName="genres"
    />
  );
}
