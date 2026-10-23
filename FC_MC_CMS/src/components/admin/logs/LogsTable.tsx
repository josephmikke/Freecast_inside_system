import React, { useEffect, useMemo } from 'react';
import { Row, usePagination, useTable } from 'react-table';
import CustomTablePagination from '@components/commons/tables/CustomTablePagination';
import CustomRow from '@components/commons/tables/CustomRow';
import CustomLoader from '@components/commons/CustomLoader';
import useLogsColumns from '@components/admin/logs/useLogsColumns';

interface LogsTableProps {
  data: any;
  size?: number;
  rowHeight?: number;
  pageCount?: number;
  loading?: boolean;
  onPaginationChange?: (pagination: { pageIndex: number, pageSize: number }) => void;
}

export default function LogsTable({
  data,
  size = 10,
  rowHeight = 85,
  pageCount = -1,
  loading = false,
  onPaginationChange,
}: LogsTableProps) {
  const columns = useLogsColumns();

  const {
    getTableProps,
    getTableBodyProps,
    prepareRow,
    page,
    gotoPage,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: size,
      }, // Pass our hoisted table state
      manualPagination: true, // Tell the usePagination
      // hook that we'll handle our own data fetching
      // This means we'll also have to provide our own
      // pageCount.
      pageCount: pageCount || -1,
      autoResetFilters: false,
      autoResetSortBy: false,
      autoResetAll: false,
    },
    usePagination,
  );

  useEffect(() => {
    if (onPaginationChange) {
      onPaginationChange({ pageIndex, pageSize });
    }
  }, [pageIndex, pageSize]);

  const beginPage = useMemo(() => Math.floor(pageIndex / 5) * 5, [pageIndex]);
  const endPage = useMemo(() => {
    if (pageCount === -1) return beginPage + 5;
    return Math.min(beginPage + 5, pageCount);
  }, [beginPage, pageCount]);

  const onPrev = () => {
    gotoPage(Math.max(0, Math.floor(pageIndex / 5) * 5 - 5));
  };

  const onNext = () => {
    if (pageCount === -1) {
      gotoPage(Math.floor(pageIndex / 5) * 5 + 5);
    }
    gotoPage(Math.min(pageCount - 1, Math.floor(pageIndex / 5) * 5 + 5));
  };

  return (
    <>
      {(pageCount !== 0) && (
        <>
          <CustomTablePagination
            pageIndex={pageIndex}
            beginPage={beginPage}
            endPage={endPage}
            onPrev={onPrev}
            onNext={onNext}
            gotoPage={gotoPage}
          />
          <table {...getTableProps()}>
            <tbody {...getTableBodyProps()}>
              {page.map((row: Row<any>) => {
                prepareRow(row);
                return (
                  <CustomRow
                    rowHeight={rowHeight}
                    rowRounded="rounded-sm"
                    row={row}
                    onClick={() => {}}
                    {...row.getRowProps()}
                  />
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {loading ? (
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
    </>
  );
}
