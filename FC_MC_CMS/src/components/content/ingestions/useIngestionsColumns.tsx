import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import moment from 'moment/moment';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';

export default function useIngestionsColumns() : Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Parent Id',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.parentId} />
      ),
      accessor: 'parentId',
      flex: 1,
    },
    {
      Header: 'Pages number',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={`${row.original.pagesNumber} pages`} />
      ),
      accessor: 'pagesNumber',
      flex: 1,
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={`First page created at ${moment(row.original.firstPageCreatedAt).format('MM/DD/YYYY hh:mm:ss')}`} />
      ),
      flex: 2,
    },
    {
      Header: 'Status',
      Cell: ({ row }: { row: Row<any> }) => (
        <div className="flex flex-col">
          <p className={row.original.failedItems > 0 ? 'text-red' : ''}>
            <strong>{row.original.failedItems}</strong>
            {' '}
            item(s) failed
          </p>
          <p className={row.original.inProgressItems > 0 ? 'text-orange' : ''}>
            <strong>{row.original.inProgressItems}</strong>
            {' '}
            item(s) in progress
          </p>
          <p className={row.original.completedItems > 0 ? 'text-green' : ''}>
            <strong>{row.original.completedItems}</strong>
            {' '}
            item(s) completed
          </p>
        </div>
      ),
      accessor: 'status',
      flex: 1,
    },
  ], []);
}
