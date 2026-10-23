import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import TagCell from '@components/commons/cells/TagCell';
import TrashCell from '@components/commons/cells/TrashCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import { EPGTemplateResult } from '@entities/content/epgtemplate';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';

export default function useEpgTemplatesColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(
    () => [
      {
        Header: 'Name',
        Cell: ({ row }: { row: Row<EPGTemplateResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        flex: 0.6,
      },
      {
        Header: 'Details',
        Cell: ({ row }: { row: Row<EPGTemplateResult> }) => (
          <SimpleTextCell text={`Slug: ${row.original.extId}`} />
        ),
        flex: 1,
      },
      {
        Header: 'Dates',
        Cell: ({ row }: { row: Row<EPGTemplateResult> }) => (
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
        Cell: ({ row }: { row: Row<EPGTemplateResult> }) => (
          // @ts-ignore
          <TagCell value={row.original.templateType?.value ?? row.original.templateType} />
        ),
        flex: 0.5,
      },
      {
        Header: 'Checkbox',
        Cell: ({ row } : { row: Row<EPGTemplateResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.2,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<EPGTemplateResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="EPG Template" />
        ),
        flex: 0.2,
      },
    ],
    [],
  );
}
