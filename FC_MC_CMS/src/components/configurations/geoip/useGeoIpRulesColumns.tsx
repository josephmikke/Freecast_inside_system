import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import TrashCell from '@components/commons/cells/TrashCell';
import DragCell from '@components/commons/cells/DragCell';
import TagCell from '@components/commons/cells/TagCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import { GeoIPRuleResult } from '@entities/configurations/geoiprule';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useGeoIpRulesColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Drag',
      Cell: () => (<DragCell />),
      flex: 0.15,
    },
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<GeoIPRuleResult> }) => (
        <SimpleTextCell text={row.original.name} />
      ),
      flex: 1,
    },
    {
      Header: 'Description',
      Cell: ({ row }: { row: Row<GeoIPRuleResult> }) => (
        <SimpleTextCell text={row.original.description} />
      ),
      flex: 1,
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<GeoIPRuleResult> }) => (
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
      Header: 'Status',
      Cell: ({ row }: { row: Row<GeoIPRuleResult> }) => (
        <TagCell color={row.original.policyType === 'ALLOW' ? '!bg-green' : '!bg-red'} value={row.original.policyType} />
      ),
      flex: 0.6,
    },
    {
      Header: 'Checkbox',
      Cell: ({ row } : { row: Row<GeoIPRuleResult> }) => (
        <CheckboxCell
          onChange={(checked) => onClickEnable(checked, row)}
          checked={row.original.enabled}
        />
      ),
      flex: 0.3,
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row<GeoIPRuleResult> }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="GeoIP Rule" />
      ),
      flex: 0.3,
    },
  ], []);
}
