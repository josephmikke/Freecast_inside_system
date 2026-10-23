import { Column, Row } from 'react-table';
import React, { useMemo } from 'react';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import DragCell from '@components/commons/cells/DragCell';
import TagCell from '@components/commons/cells/TagCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import TrashCell from '@components/commons/cells/TrashCell';
import { PackageResult } from '@entities/configurations/package';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';

export default function usePackagesColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(
    () => [
      {
        Header: 'Drag',
        Cell: () => (<DragCell />),
        flex: 0.1,
      },
      {
        Header: 'Name',
        Cell: ({ row }: { row: Row<PackageResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        flex: 1,
      },
      {
        Header: 'Type',
        Cell: ({ row }: { row: Row<PackageResult> }) => (
          <TagCell value={row.original.type} />
        ),
        flex: 0.3,
      },
      {
        Header: 'Revenue Model',
        Cell: ({ row }: { row: Row<PackageResult> }) => (
          <TagCell value={row.original.revenueModel} />
        ),
        flex: 0.3,
      },
      {
        Header: 'Default',
        Cell: ({ row }: { row: Row<PackageResult> }) => (
          <TagCell display={row.original.default} value="Default" />
        ),
        flex: 0.3,
      },
      {
        Header: 'Checkbox',
        Cell: ({ row } : { row : Row<PackageResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.1,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<PackageResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Package" />
        ),
        flex: 0.1,
      },
    ],
    [],
  );
}
