import React from 'react';
import { GeoIpRules } from '@api/index';
import CustomTable from '@components/commons/tables/CustomTable';
import useGeoIpRulesColumns from '@components/configurations/geoip/useGeoIpRulesColumns';

interface GeoIPRulesTableProps {
  refetch: () => void;
  data: any;
}
export default function GeoIPRulesTable({ refetch, data }: GeoIPRulesTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useGeoIpRulesColumns}
      getEditPath={(id: string) => `/configurations/geoiprules/${id}/edit`}
      deleteEntity={GeoIpRules.deleteGeoIpRule}
      updateEntity={GeoIpRules.updateGeoIpRule}
      updateWeightEntity={GeoIpRules.updateWeightGeopIpRule}
      entityName="GeoIp Rule"
      isDraggable
    />
  );
}
