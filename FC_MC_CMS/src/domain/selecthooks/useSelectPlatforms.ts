import { useMemo } from 'react';
import { Platforms } from '@api/index';
import { PlatformResult } from '@entities/configurations/platform';

interface UseSelectPlatformsReturn {
  platforms: { label: string, value: string, weight: number }[];
  platformsIsFetching: boolean;
}

export default function useSelectPlatforms(): UseSelectPlatformsReturn {
  const {
    data: platformsData,
    error: platformsError,
    isFetching: platformsIsFetching,
  } = Platforms.usePlatforms();

  return <UseSelectPlatformsReturn>useMemo(
    () => {
      if (!platformsData?.data?.platforms || platformsError || platformsIsFetching) {
        return { platforms: [], platformsIsFetching };
      }
      return {
        platforms: platformsData?.data?.platforms
          ?.filter((platform: PlatformResult) => platform.enabled)
          ?.map((platform: PlatformResult) => ({ label: platform.name, value: platform.id })),
        platformsIsFetching,
      };
    },
    [platformsError, platformsData, platformsIsFetching],
  );
}
