import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import useEPGColumns from '@components/content/channels/epg/useEPGColumns';

interface EPGTableProps {
  refetch: () => void;
  data: any[];
  onClickRow: (id: string) => void;
  placeholderThumbnail?: string;
}

export default function EPGTable({
  refetch,
  data,
  onClickRow,
  placeholderThumbnail,
}: EPGTableProps) {
  return (
    <CustomTable
      containerClassName="w-full"
      customOnClickRow={onClickRow}
      refetch={refetch}
      data={data.map((program) => ({
        ...program,
        thumbnail: program.thumbnail || placeholderThumbnail,
      }))}
      useColumns={useEPGColumns}
      deleteEntity={() => {}}
      updateEntity={() => {}}
      entityName="EPG Programs"
    />
  );
}
