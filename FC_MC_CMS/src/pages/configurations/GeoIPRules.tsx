import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { GeoIpRules } from '@api/index';
import { Configurations } from '@components/index';
import { GeoIPRuleResult } from '@entities/configurations/geoiprule';

interface GeoIpRulesPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function GeoIpRulesPage({ action }: GeoIpRulesPageProps) {
  return (
    <EntityModalFormTablePage<GeoIPRuleResult>
      action={action}
      useData={GeoIpRules.useGeoIpRules}
      title="GeoIP Rules"
      desc="List of GeoIP Rules that can be used across most areas of the CMS."
      Form={Configurations.GeoIPRuleForm}
      Table={Configurations.GeoIPRulesTable}
      dataFieldName="rules"
    />
  );
}
