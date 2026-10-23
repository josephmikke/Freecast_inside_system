import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import TrashCell from '@components/commons/cells/TrashCell';
import { getLabel, getValue, StringOrValueLabel } from '@components/configurations/misc';
import TagCell from '@components/commons/cells/TagCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import { LocationResult } from '@entities/configurations/location';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import { filter, filterSearchByName } from '@components/filtersAndSorters/filterFunction';

function doesIncludesThisId(
  id: string,
  filterValues: any[],
): boolean {
  return filterValues.map((item) => item.original.id).includes(id);
}

function isChildrenOfOneOfThem(
  locations: any[],
  filterValues: any[],
) {
  return locations.some((location: any) => (doesIncludesThisId(location.value, filterValues)));
}

function getLocationsByTypes(rows: Row<LocationResult>[]): {
  countries: Row<LocationResult>[],
  states: Row<LocationResult>[],
  cities: Row<LocationResult>[],
  zipcodes: Row<LocationResult>[],
} {
  return {
    countries: rows.filter((row) => row.original.type === 'COUNTRY'),
    states: rows.filter((row) => row.original.type === 'STATE'),
    cities: rows.filter((row) => row.original.type === 'CITY'),
    zipcodes: rows.filter((row) => row.original.type === 'ZIPCODE'),
  };
}

function filterOnAllChildrenForZipcodes(
  rows: Row<any>[],
  id: string[],
  filterValues: string[],
): Row<any>[] {
  if (!filterValues?.length) { return rows; }
  const {
    zipcodes,
  } = getLocationsByTypes(rows);

  return zipcodes.filter(({ original }) => filterValues.includes(original.id));
}

function filterOnAllChildrenForCities(
  rows: Row<any>[],
  id: string[],
  filterValues: string[],
): Row<any>[] {
  if (!filterValues?.length) { return rows; }
  const {
    cities, zipcodes,
  } = getLocationsByTypes(rows);

  const filteredCities = cities.filter(({ original }) => filterValues.includes(original.id));
  const filteredZipCodes = zipcodes.filter(
    ({ original }) => isChildrenOfOneOfThem(original.cities || [], filteredCities),
  );

  return [...filteredCities, ...filteredZipCodes];
}

function filterOnAllChildrenForStates(
  rows: Row<any>[],
  id: string[],
  filterValues: string[],
): Row<any>[] {
  if (!filterValues?.length) { return rows; }
  const {
    states, cities, zipcodes,
  } = getLocationsByTypes(rows);

  const filteredStates = states.filter(({ original }) => filterValues.includes(original.id));
  const filteredCities = cities.filter(
    ({ original }) => isChildrenOfOneOfThem(original.states || [], filteredStates),
  );
  const filteredZipCodes = zipcodes.filter(
    ({ original }) => isChildrenOfOneOfThem(original.cities || [], filteredCities),
  );

  return [...filteredStates, ...filteredCities, ...filteredZipCodes];
}

function filterOnAllChildrenForCountry(
  rows: Row<any>[],
  id: string[],
  filterValues: string[],
): Row<any>[] {
  if (!filterValues?.length) { return rows; }
  const {
    countries, states, cities, zipcodes,
  } = getLocationsByTypes(rows);

  const filteredCountries = countries.filter(({ original }) => filterValues.includes(original.id));
  const filteredStates = states.filter(
    ({ original }) => isChildrenOfOneOfThem(original.countries || [], filteredCountries),
  );
  const filteredCities = cities.filter(
    ({ original }) => isChildrenOfOneOfThem(original.states || [], filteredStates),
  );
  const filteredZipCodes = zipcodes.filter(
    ({ original }) => isChildrenOfOneOfThem(original.cities || [], filteredCities),
  );

  return [...filteredCountries, ...filteredStates, ...filteredCities, ...filteredZipCodes];
}

export default function useLocationsColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(
    () => [
      {
        Header: 'Name',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        accessor: 'name',
        id: 'name',
        flex: 1,
      },
      {
        Header: 'Slug',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <SimpleTextCell text={`Slug: ${row.original.slug}`} />
        ),
        id: 'slug',
        accessor: 'slug',
        flex: 1,
      },
      {
        Header: 'Id',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <SimpleTextCell text={`ID: ${row.original.id}`} />
        ),
        id: 'id',
        accessor: 'id',
        sortType: 'basic',
        flex: 1,
      },
      {
        Header: 'Type',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <TagCell colored value={row.original.type} />
        ),
        accessor: 'type',
        id: 'type',
        flex: 0.6,
      },
      {
        Header: 'Packages',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <div>
            {row.original.packages?.map((pkg) => (
              <TagCell
                className="m-2"
                value={getLabel(pkg as StringOrValueLabel)}
                key={getValue(pkg as StringOrValueLabel)}
              />
            ))}
          </div>
        ),
        filter: filter((pkg) => pkg.value),
        accessor: 'packages',
        id: 'packages',
        flex: 0.6,
      },
      {
        Header: 'Checkbox',
        Cell: ({ row } : { row : Row<LocationResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.2,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<LocationResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Location" />
        ),
        flex: 0.2,
      },
      // filter purpose
      { accessor: (row) => row.states, filter: filterOnAllChildrenForStates, id: 'states' },
      { accessor: (row) => row.cities, filter: filterOnAllChildrenForCities, id: 'cities' },
      { accessor: (row) => row.countries, filter: filterOnAllChildrenForCountry, id: 'countries' },
      { accessor: (row) => row.zipcodes, filter: filterOnAllChildrenForZipcodes, id: 'zipcodes' },
      { id: 'search', filter: filterSearchByName },
    ],
    [],
  );
}
