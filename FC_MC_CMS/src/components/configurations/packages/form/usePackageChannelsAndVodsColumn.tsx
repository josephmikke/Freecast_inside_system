import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import TrashCell from '@components/commons/cells/TrashCell';
import TagCell from '@components/commons/cells/TagCell';

interface UsePackageChannelColumnProps {
  onClickTrash: (event: React.MouseEvent<SVGSVGElement, MouseEvent>, row: any) => any;
}

export default function usePackageChannelsAndVodsColumn({
  onClickTrash,
}: UsePackageChannelColumnProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Thumbnail',
      Cell: ({ row }: { row: Row<any> }) => (
        <img
          className="h-[50px] w-[50px]"
          alt="channel thumbnail"
          src={row.original.thumbnail || row.original.mainImage}
        />
      ),
      flex: 0.3,
    },
    {
      Header: 'Name',
      accessor: 'name',
      flex: 1,
    },
    {
      Header: 'ID',
      accessor: 'id',
      flex: 1,
    },
    {
      Header: 'Type',
      accessor: 'type',
      flex: 1,
      Cell: ({ row }: { row: Row<any> }) => (
        <TagCell colored={row.original.type !== 'Channel'} value={row.original.type} />
      ),
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Channel" />
      ),
      flex: 0.5,
    },
  ], []);
}
