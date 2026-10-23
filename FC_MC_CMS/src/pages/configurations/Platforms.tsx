import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Platforms } from '@api/index';
import { Configurations } from '@components/index';
import { PlatformResult } from '@entities/configurations/platform';

interface PlatformsPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function PlatformsPage({ action }: PlatformsPageProps) {
  return (
    <EntityModalFormTablePage<PlatformResult>
      action={action}
      useData={Platforms.usePlatforms}
      title="Platforms"
      desc="List of Platforms that can be used across most areas of the CMS."
      Form={Configurations.PlatformForm}
      Table={Configurations.PlatformsTable}
      dataFieldName="platforms"
    />
  );
}
