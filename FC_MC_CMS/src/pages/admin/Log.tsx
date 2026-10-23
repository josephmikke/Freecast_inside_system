import React, { useMemo, useState } from 'react';
import { Nav } from '@components/index';
import { LogsTable } from '@components/admin';
import { usePaginatedLogs } from '@api/admin/logs';

export default function LogsPage() {
  const [
    pagination,
    setPagination,
  ] = useState<{ pageIndex: number, pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });

  const {
    logs,
    isFetching,
    count,
    hasNextPage,
    // fetchNextPage,
    // refetch,
    error,
  } = usePaginatedLogs(pagination);

  const itemsLogs = useMemo(() => {
    if (error) {
      return [];
    }
    return logs;
  }, [logs, error]);

  const pageCount = useMemo(() => {
    if (hasNextPage) {
      return -1;
    }
    return Math.ceil(count / pagination.pageSize);
  }, [hasNextPage, count, pagination.pageSize]);

  return (
    <Nav.Content
      title="Logs"
      desc="List of item logs for tracking admin user activities"
    >
      <LogsTable
        data={itemsLogs}
        loading={isFetching}
        pageCount={pageCount}
        onPaginationChange={setPagination}
      />
    </Nav.Content>
  );
}
