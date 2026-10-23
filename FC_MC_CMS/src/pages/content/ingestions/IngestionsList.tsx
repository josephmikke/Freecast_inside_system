import React, { useEffect, useMemo, useState } from 'react';
import { Content, Nav } from '@components/index';
import CustomLoader from '@components/commons/CustomLoader';
import AddTopPageButton from '@components/commons/AddTopPageButton';
import { IngestionResult } from '@entities/content/ingestion';
import CustomTablePagination from '@components/commons/tables/CustomTablePagination';
import LoadAllButton from '@components/content/vod/buttons/LoadAllButton';
import StopButton from '@components/content/vod/buttons/StopButton';

interface IngestionsListProps {
  items: IngestionResult[];
  isFetching: boolean;
  refetch: () => void;
  hasNextPage?: boolean;
  fetchNextPage?: () => Promise<any>;
}

export default function IngestionsList({
  items,
  isFetching,
  refetch,
  hasNextPage,
  fetchNextPage,
}: IngestionsListProps) {
  const [pagination, setPagination] = useState<{
    pageIndex: number,
    pageSize: number
  }>({ pageIndex: 0, pageSize: 10 });
  const [sortBy, setSortBy] = useState<{ id: string; desc: boolean }[]>([
    { id: 'firstPageCreatedAt', desc: true },
  ]);

  const [isLoadAll, setLoadAll] = useState<boolean>(false);

  const { pageIndex, pageSize } = pagination;
  const from = pageIndex * pageSize;
  const to = from + pageSize;

  useEffect(() => {
    (async () => {
      if ((isLoadAll || items.length < to) && hasNextPage && fetchNextPage) {
        await fetchNextPage();
      }
    })();
  }, [items.length, pageIndex, pageSize, hasNextPage, isLoadAll]);

  useEffect(() => {
    if (!hasNextPage && isLoadAll) {
      setLoadAll(false);
    }
  }, [hasNextPage, isLoadAll]);

  const sortedItems = useMemo(() => {
    if (!sortBy || sortBy.length === 0) return items;
    const copy = [...items];
    copy.sort((a: any, b: any) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const option of sortBy) {
        const { id, desc } = option;
        const av = a[id];
        const bv = b[id];
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
      }
      return 0;
    });
    return copy;
  }, [items, sortBy]);

  const pagedItems = useMemo(() => sortedItems.slice(from, to), [sortedItems, from, to]);
  const count = sortedItems.length;
  const pageCount = useMemo(() => {
    if (hasNextPage) return -1;
    return Math.ceil(count / pageSize);
  }, [hasNextPage, count, pageSize]);

  const beginPage = useMemo(() => Math.floor(pageIndex / 5) * 5, [pageIndex]);
  const endPage = useMemo(() => {
    if (pageCount === -1) return beginPage + 5;
    return Math.min(beginPage + 5, pageCount);
  }, [beginPage, pageCount]);

  const onPrev = () => {
    setPagination((p) => ({ ...p, pageIndex: Math.max(0, Math.floor(pageIndex / 5) * 5 - 5) }));
  };

  const onNext = () => {
    if (pageCount === -1) {
      setPagination((p) => ({ ...p, pageIndex: Math.floor(pageIndex / 5) * 5 + 5 }));
      return;
    }
    setPagination((p) => ({
      ...p,
      pageIndex: Math.min(pageCount - 1, Math.floor(pageIndex / 5) * 5 + 5),
    }));
  };

  const gotoPage = (p: number) => setPagination((prev) => ({ ...prev, pageIndex: p }));

  return (
    <Nav.Content
      title="Ingestions"
      desc="List of Ingestions."
    >
      <AddTopPageButton refresh refetch={refetch} />
      <div className="mt-4 mb-2 flex items-center gap-3 justify-end">
        <LoadAllButton
          onClick={() => setLoadAll(true)}
          loading={isLoadAll && isFetching}
          disabled={isLoadAll || !hasNextPage}
        />
        {(isLoadAll) && (
          <StopButton
            onClick={() => setLoadAll(false)}
          />
        )}
      </div>
      <div className="mt-4 mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <select
            className="bg-gray-light rounded px-2 py-1"
            value={`${sortBy[0]?.id || 'firstPageCreatedAt'}:${sortBy[0]?.desc ? 'desc' : 'asc'}`}
            onChange={(e) => {
              const [id, dir] = e.target.value.split(':');
              setSortBy([{ id, desc: dir === 'desc' }]);
            }}
          >
            <option value="parentId:desc">ID Desc</option>
            <option value="parentId:asc">ID Asc</option>
            <option value="firstPageCreatedAt:desc">Created Date Desc</option>
            <option value="firstPageCreatedAt:asc">Created Date Asc</option>
            <option value="pagesNumber:desc">Pages number Desc</option>
            <option value="pagesNumber:asc">Pages number Asc</option>
            <option value="failedItems:desc">Failed items Desc</option>
            <option value="failedItems:asc">Failed items Asc</option>
            <option value="inProgressItems:desc">In progress Desc</option>
            <option value="inProgressItems:asc">In progress Asc</option>
            <option value="completedItems:desc">Completed items Desc</option>
            <option value="completedItems:asc">Completed items Asc</option>
          </select>
        </div>
      </div>
      <div className="mt-6">
        <CustomTablePagination
          pageIndex={pageIndex}
          beginPage={beginPage}
          endPage={endPage}
          onPrev={onPrev}
          onNext={onNext}
          gotoPage={gotoPage}
        />
      </div>
      <Content.IngestionsTable isFetching={isFetching} refetch={refetch} data={pagedItems} />
      <div className="mt-6">
        {isFetching ? (
          <CustomLoader />
        ) : (
          <CustomTablePagination
            pageIndex={pageIndex}
            beginPage={beginPage}
            endPage={endPage}
            onPrev={onPrev}
            onNext={onNext}
            gotoPage={gotoPage}
          />
        )}
      </div>
      {isFetching && <CustomLoader />}
    </Nav.Content>
  );
}
