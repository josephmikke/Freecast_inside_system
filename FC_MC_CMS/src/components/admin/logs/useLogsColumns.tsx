import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useLogsColumns(): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Event',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.event} />
      ),
      flex: 1,
      accessor: 'event',
      id: 'event',
    },
    {
      Header: 'Entity',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.entity} />
      ),
      flex: 1,
      accessor: 'entity',
      id: 'entity',
    },
    {
      Header: 'Entity ID',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={`id: ${row.original.entityId}`} />
      ),
      flex: 2,
      accessor: 'entityId',
      id: 'entityId',
    },
    {
      Header: 'User',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.user} />
      ),
      flex: 2,
      accessor: 'user',
      id: 'user',
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<any> }) => (
        <DoubleDateCell
          firstLabelDate="Created"
          secondLabelDate="Updated"
          secondDate={row.original.updatedAt}
          firstDate={row.original.createdAt}
        />
      ),
      flex: 2,
    },
  ], []);
}
