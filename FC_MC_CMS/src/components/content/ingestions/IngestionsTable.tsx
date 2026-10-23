import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import CustomLoader from '@components/commons/CustomLoader';
import useIngestionsColumns from '@components/content/ingestions/useIngestionsColumns';

interface IngestionsTableProps {
  refetch: () => void;
  data: any[];
  isFetching?: boolean;
}

export default function IngestionsTable({
  refetch,
  data,
  isFetching,
}: IngestionsTableProps) {
  return (
    <>
      {isFetching && (
        <div className="w-full pt-3 -mb-8 flex justify-end">
          <CustomLoader contained={false} size={30} />
        </div>
      )}
      {!isFetching && (
        <CustomTable
          refetch={refetch}
          data={data}
          useColumns={useIngestionsColumns}
          getEditPath={(id: string, row: any) => `/content/ingestions/${row.parentId}/edit`}
          deleteEntity={() => {}}
          updateEntity={() => {}}
          entityName="Ingestions"
        />
      )}
    </>
  );
}
