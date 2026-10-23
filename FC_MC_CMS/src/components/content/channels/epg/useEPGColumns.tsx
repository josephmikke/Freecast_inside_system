import { Column, Row } from 'react-table';
import React, { useMemo } from 'react';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import { ChannelEPGProgramResult } from '@entities/content/channel';
import TagCell from '@components/commons/cells/TagCell';

export default function useEPGColumns(): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Image',
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <div className="max-h-[75px]">
          {/* @ts-ignore */}
          <img className="max-h-[75px]" src={row.original.thumbnail} alt={row.original.title} />
        </div>
      ),
      flex: 0.4,
    },
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <SimpleTextCell text={row.original.title} />
      ),
      accessor: 'name',
      flex: 1,
    },
    {
      Header: 'ID',
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <SimpleTextCell text={row.original.id} />
      ),
      accessor: 'id',
      flex: 0.7,
    },
    {
      Header: 'Start time',
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <SimpleTextCell text={`Start Time: ${row.original.start_time} UTC`} />
      ),
      accessor: 'start_time',
      flex: 0.7,
    },
    {
      Header: 'End time',
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <SimpleTextCell text={`End Time: ${row.original.end_time} UTC`} />
      ),
      accessor: 'end_time',
      flex: 0.7,
    },
    {
      Header: 'Catch-up',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Cell: ({ row }: { row: Row<ChannelEPGProgramResult> }) => (
        <TagCell value="Catch-up" />
      ),
      accessor: 'catchup',
      flex: 0.7,
    },
  ], []);
}
