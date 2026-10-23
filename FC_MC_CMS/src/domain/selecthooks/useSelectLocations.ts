import { useMemo } from 'react';
import { Locations } from '@api/index';
import { LocationResult } from '@entities/configurations/location';
import { StringOrValueLabel } from '@components/configurations/misc';

interface UseSelectLocationsReturn {
  locations: StringOrValueLabel[];
  locationsIsFetching: boolean;
}

export default function useSelectLocations(): UseSelectLocationsReturn {
  const {
    data: locationsData,
    error: locationsError,
    isFetching: locationsIsFetching,
  } = Locations.useLocations();

  return useMemo<UseSelectLocationsReturn>(
    () => {
      if (!locationsData?.data?.locations || locationsError || locationsIsFetching) {
        return { locations: [], locationsIsFetching };
      }
      return {
        locations: locationsData?.data?.locations
          ?.filter((loc: LocationResult) => loc.enabled)
          ?.map((loc: LocationResult) => ({
            label: loc.name, value: loc.id,
          })),
        locationsIsFetching,
      };
    },
    [locationsError, locationsData, locationsIsFetching],
  );
}
