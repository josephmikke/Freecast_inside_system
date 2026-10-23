import React from 'react';
import useProvidersColumns from '@components/configurations/providers/useProvidersColumns';
import CustomTable from '@components/commons/tables/CustomTable';
import { Providers } from '@api/index';

interface ProvidersTableProps {
  data: any;
  refetch: () => void;
}

export default function ProvidersTable({ data, refetch }: ProvidersTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useProvidersColumns}
      getEditPath={(id: string) => `/configurations/providers/${id}/edit`}
      deleteEntity={Providers.deleteProvider}
      updateEntity={Providers.updateProvider}
      entityName="Provider"
    />
  );
}
