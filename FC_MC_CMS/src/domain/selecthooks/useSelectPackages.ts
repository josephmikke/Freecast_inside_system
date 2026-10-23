import { useMemo } from 'react';
import { Packages } from '@api/index';
import { PackageResult } from '@entities/configurations/package';

interface UseSelectPackagesReturn {
  packages: { label: string, value: string, weight: number }[];
  packagesIsFetching: boolean;
}

export default function useSelectPackages() {
  const {
    data: packagesData,
    error: packagesError,
    isFetching: packagesIsFetching,
  } = Packages.usePackages();

  return useMemo<UseSelectPackagesReturn>(
    () => {
      if (!packagesData?.data?.packages || packagesError || packagesIsFetching) {
        return { packages: [], packagesIsFetching };
      }
      return {
        packages: packagesData?.data?.packages
          ?.filter((pkg: PackageResult) => pkg.enabled)
          ?.map((pkg: PackageResult) => ({
            label: pkg.name, value: pkg.id,
          })),
        packagesIsFetching,
      };
    },
    [packagesError, packagesData, packagesIsFetching],
  );
}
