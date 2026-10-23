import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import usePlatformsColumns from '@components/configurations/platforms/usePlatformsColumns';
import { Platforms } from '@api/index';

interface PlatformsTableProps {
  data: any;
  refetch: () => void;
}

export default function PlatformsTable({ data, refetch }: PlatformsTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={usePlatformsColumns}
      getEditPath={(id: string) => `/configurations/platforms/${id}/edit`}
      deleteEntity={Platforms.deletePlatform}
      updateEntity={Platforms.updatePlatform}
      entityName="Platform"
    />
  );
}
