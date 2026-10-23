import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { FieldSelect } from '@components/form';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import { LocationResult } from '@entities/configurations/location';

interface LocationDetailsProps {
  name: string;
  control: Control<any>;
  errors: any;
  allLocations: LocationResult[];
}

export default function LocationDetails({
  name,
  control,
  errors,
  allLocations,
}: LocationDetailsProps) {
  const locationMappedData = allLocations
    .filter((location: LocationResult) => location.enabled)
    .map((d: any) => (
      { value: d.id, label: d.name, type: d.type }
    ));
  const { packages } = useSelectPackages();

  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            value: locationType,
          },
        }: any,
      ) => (
        <div className="flex flex-col">
          {locationType !== 'PACKAGE' && (
            <FieldSelect
              label="Package Affiliation"
              name="packages"
              isMulti
              values={packages}
              control={control}
              errors={errors}
            />
          )}
          {locationType === 'STATE' && (
            <FieldSelect
              containerClassName="mt-3"
              isMulti
              label="Country Affiliation"
              name="countries"
              values={locationMappedData.filter((d: any) => d.type === 'COUNTRY')}
              control={control}
              errors={errors}
            />
          )}
          {locationType === 'ZIPCODE' && (
            <FieldSelect
              containerClassName="mt-3"
              isMulti
              label="City Affiliation"
              name="cities"
              values={locationMappedData.filter((d: any) => d.type === 'CITY')}
              control={control}
              errors={errors}
            />
          )}
          {(locationType === 'CITY') && (
            <FieldSelect
              containerClassName="mt-3"
              isMulti
              label="State Affiliation"
              name="states"
              values={locationMappedData.filter((d: any) => d.type === 'STATE')}
              control={control}
              errors={errors}
            />
          )}
        </div>
      )}
    />
  );
}
