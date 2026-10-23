import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import TrashCell from '@components/commons/cells/TrashCell';
import DragCell from '@components/commons/cells/DragCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import { CategoryResult } from '@entities/configurations/category';
import { PlatformResult } from '@entities/configurations/platform';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useCategoriesColumns({
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
        Cell: ({ row }: { row: Row<PlatformResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        flex: 1,
      },
      {
        Header: 'Details',
        Cell: ({ row }: { row: Row<PlatformResult> }) => (
          <SimpleTextCell text={`ID: ${row.original.extId}`} />
        ),
        flex: 1,
      },
      {
        Header: 'Dates',
        Cell: ({ row }: { row: Row<CategoryResult> }) => (
          <DoubleDateCell
            firstLabelDate="Created"
            secondLabelDate="Updated"
            secondDate={row.original.updatedAt}
            firstDate={row.original.createdAt}
          />
        ),
        flex: 2,
      },
      {
        Header: 'Checkbox',
        Cell: ({ row } : { row : Row<CategoryResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.2,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<CategoryResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Category" />
        ),
        flex: 0.2,
      },
    ],
    [],
  );
}
