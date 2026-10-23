import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import IngestionFormAdd from '@pages/content/ingestions/IngestionFormAdd';
import IngestionFormEdit from '@pages/content/ingestions/IngestionFormEdit';
import IngestionsList from '@pages/content/ingestions/IngestionsList';
import useAllIngestions from '@/domain/hooks/useAllIngestions';
import { IngestionResult } from '@entities/content/ingestion';
import groupBy from '@utils/groupBy';

interface IngestionPageProps {
  action: 'add' | 'edit' | 'list';
}

function IngestionsPage({ action }: IngestionPageProps) {
  const {
    ingestions: data, error, isFetching, refetch, hasNextPage, fetchNextPage,
  } = useAllIngestions();

  const items: any[] = useMemo(
    () => {
      if (!data || error) return [];
      const grouped = groupBy(data, 'parentId');

      return Object.keys(grouped)
        .map((key) => ({
          id: key,
          parentId: key,
          value: grouped[key],
          failedItems: grouped[key].reduce((acc: number, curr: any) => acc + (curr.status === 'FAILED' ? 1 : 0), 0),
          inProgressItems: grouped[key].reduce((acc: number, curr: any) => acc + (curr.status === 'IN_PROGRESS' ? 1 : 0), 0),
          completedItems: grouped[key].reduce((acc: number, curr: any) => acc + (curr.status === 'COMPLETED' ? 1 : 0), 0),
          firstPageCreatedAt: grouped[key][0].createdAt,
          pagesNumber: grouped[key].length,
        }));
    },
    [data, isFetching, error],
  );

  const { id } = useParams();

  let item: IngestionResult | undefined;

  if (id && items && !isFetching) {
    item = items.find((i) => i.parentId === id);
  }

  if (action === 'add') {
    return <IngestionFormAdd />;
  }

  if (action === 'edit') {
    return <IngestionFormEdit isFetching={isFetching} item={item!} />;
  }

  return (
    <IngestionsList
      isFetching={isFetching}
      refetch={refetch}
      items={items}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
    />
  );
}

export default IngestionsPage;
