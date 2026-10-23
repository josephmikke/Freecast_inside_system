import React, { useMemo } from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Locations } from '@api/index';
import { Configurations } from '@components/index';
import { LocationResult } from '@entities/configurations/location';

interface LocationsPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function LocationsPage({ action }: LocationsPageProps) {
  const {
    data,
    error,
    isFetching,
  } = Locations.useLocations();

  const mapData = (item: LocationResult) => ({
    ...item,
    packages: item.packages.map((pkg: any) => ({ value: pkg.id, label: pkg.name })),
    countries: item.countries?.map((country: any) => ({
      value: country.id,
      label: country.name,
    })),
    states: item.states?.map((state: any) => ({ value: state.id, label: state.name })),
    zipCodes: item.zipCodes?.map((zip: any) => ({ value: zip.id, label: zip.name })),
    cities: item.cities?.map((city: any) => ({ value: city.id, label: city.name })),
  });

  const allLocations: LocationResult[] = useMemo(
    () => {
      if (!data?.data?.locations || isFetching || error) return [];
      return data.data.locations.map(mapData);
    },
    [data, isFetching, error],
  );

  return (
    <EntityModalFormTablePage<LocationResult>
      action={action}
      useData={Locations.useLocations}
      title="Locations"
      desc="List of Locations that can be used across most areas of the CMS."
      Form={Configurations.LocationForm}
      formProps={{ allLocations }}
      Table={Configurations.LocationsTable}
      dataFieldName="locations"
      mapData={mapData}
    />
  );
}
