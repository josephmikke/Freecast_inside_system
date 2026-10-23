import React from 'react';
import { EpgTemplate } from '@api/index';
import useEpgTemplatesColumns from '@components/content/epgtemplates/useEpgTemplatesColumns';
import CustomTable from '@components/commons/tables/CustomTable';

interface EpgTemplatesTableProps {
  data: any[];
  refetch: () => void;
}

export default function EpgTemplatesTable({
  refetch,
  data,
}: EpgTemplatesTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useEpgTemplatesColumns}
      getEditPath={(id: string) => `/content/epgtemplates/${id}/edit`}
      deleteEntity={EpgTemplate.deleteEpgTemplate}
      updateEntity={EpgTemplate.updateEpgTemplate}
      entityName="EPG Template"
    />
  );
}
