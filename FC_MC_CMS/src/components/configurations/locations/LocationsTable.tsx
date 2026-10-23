import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import { Locations } from '@api/index';
import useLocationsColumns from '@components/configurations/locations/useLocationsColumns';
import FiltersAndSorters from '@components/filtersAndSorters/FiltersAndSorters';
import LocationsSorters from '@components/configurations/locations/sortersAndFilters/LocationsSorters';
import LocationsFilters from '@components/configurations/locations/sortersAndFilters/LocationsFilters';

interface LocationsTableProps {
  data: any;
  refetch: () => void;
}

export default function LocationsTable({ data, refetch }: LocationsTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useLocationsColumns}
      getEditPath={(id: string) => `/configurations/locations/${id}/edit`}
      deleteEntity={Locations.deleteLocation}
      updateEntity={Locations.updateLocation}
      entityName="Location"
      FiltersSortersComponent={FiltersAndSorters}
      Sorter={LocationsSorters}
      Filter={LocationsFilters}
    />
  );
}
