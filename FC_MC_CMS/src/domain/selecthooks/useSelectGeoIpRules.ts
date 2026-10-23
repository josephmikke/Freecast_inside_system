import { useMemo } from 'react';
import { GeoIpRules } from '@api/index';
import { GeoIPRuleResult } from '@entities/configurations/geoiprule';
import { StringOrValueLabel } from '@components/configurations/misc';

interface UseSelectGeoIpRulesReturn {
  geoIpRules: StringOrValueLabel[];
  geoIpRulesIsFetching: boolean;
}

export default function useSelectGeoIpRules() {
  const {
    data: geoIpRulesData,
    error: geoIpRulesError,
    isFetching: geoIpRulesIsFetching,
  } = GeoIpRules.useGeoIpRules();

  return useMemo<UseSelectGeoIpRulesReturn>(
    () => {
      if (!geoIpRulesData?.data?.rules || geoIpRulesError || geoIpRulesIsFetching) {
        return { geoIpRules: [], geoIpRulesIsFetching };
      }
      return {
        geoIpRules: geoIpRulesData?.data?.rules
          ?.filter((rule: GeoIPRuleResult) => rule.enabled)
          ?.map((rule: GeoIPRuleResult) => ({
            label: rule.name, value: rule.id,
          })),
        geoIpRulesIsFetching,
      };
    },
    [geoIpRulesError, geoIpRulesData, geoIpRulesIsFetching],
  );
}
