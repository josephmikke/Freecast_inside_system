import React from 'react';
import { Packages } from '@api/index';
import usePackagesColumns from '@components/configurations/packages/usePackagesColumns';
import CustomTable from '@components/commons/tables/CustomTable';

interface PackagesTableProps {
  data: any;
  refetch: () => void;
}

export default function PackagesTable({ data, refetch }: PackagesTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={usePackagesColumns}
      getEditPath={(id: string) => `/configurations/packages/${id}/edit`}
      deleteEntity={Packages.deletePackage}
      updateEntity={Packages.updatePackage}
      updateWeightEntity={Packages.updateWeightPackage}
      entityName="Package"
      isDraggable
    />
  );
}
