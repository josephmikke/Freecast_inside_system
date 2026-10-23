import { Column, Row } from 'react-table';
import React, { useMemo } from 'react';
import TrashCell from '@components/commons/cells/TrashCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import { ProviderResult } from '@entities/configurations/provider';
import MultiTagCell from '@components/commons/cells/MultiTagCell';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useProvidersColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(
    () => [
      {
        Header: 'Name',
        Cell: ({ row }: { row: Row<ProviderResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        flex: 1,
      },
      {
        Header: 'Details',
        Cell: ({ row }: { row: Row<ProviderResult> }) => {
          const details = [`Slug: ${row.original.extId}`];
          if (row.original.aidSlug) {
            details.push(`AID: ${row.original.aidSlug}`);
          }
          return <SimpleTextCell text={details.join(' | ')} />;
        },
        flex: 1,
      },
      {
        Header: 'Dates',
        Cell: ({ row }: { row: Row<ProviderResult> }) => (
          <DoubleDateCell
            firstLabelDate="Created"
            secondLabelDate="Updated"
            secondDate={row.original.updatedAt}
            firstDate={row.original.createdAt}
          />
        ),
        flex: 1,
      },
      {
        Header: 'Type',
        Cell: ({ row }: { row: Row<ProviderResult> }) => (
          <MultiTagCell
            tags={row.original.type.map((t: any) => t.label)}
          />
        ),
        flex: 0.6,
      },
      {
        Header: 'Checkbox',
        Cell: ({ row } : { row : Row<ProviderResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.2,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<ProviderResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Provider" />
        ),
        flex: 0.2,
      },
    ],
    [],
  );
}
