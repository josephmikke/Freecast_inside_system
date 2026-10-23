import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Packages } from '@api/index';
import { Configurations } from '@components/index';
import { PackageResult } from '@entities/configurations/package';

interface PackagesPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function PackagesPage({ action }: PackagesPageProps) {
  return (
    <EntityModalFormTablePage<PackageResult>
      action={action}
      useData={Packages.usePackages}
      title="Packages"
      desc="List of Packages that can be used across most areas of the CMS."
      Form={Configurations.PackageForm}
      Table={Configurations.PackagesTable}
      dataFieldName="packages"
      mapData={(item) => ({
        ...item,
        platforms: item.platforms.map((platform) => ({ value: platform.id, label: platform.name })),
      })}
    />
  );
}
