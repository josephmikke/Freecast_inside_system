import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Providers } from '@api/index';
import { Configurations } from '@components/index';
import { ProviderResult } from '@entities/configurations/provider';

interface ProvidersPageProps {
  action: 'add' | 'edit' | 'list';
}

function formatTypes(type: any) {
  if (typeof type === 'string') {
    return type.split(',').map((t) => ({ label: t.trim(), value: t.trim() }));
  }
  return type.map((t: any) => ({ label: t, value: t }));
}

export default function ProvidersPage({ action }: ProvidersPageProps) {
  return (
    <EntityModalFormTablePage<ProviderResult>
      action={action}
      useData={Providers.useProviders}
      title="Providers"
      desc="List of Providers that can be used across most areas of the CMS."
      Form={Configurations.ProviderForm}
      Table={Configurations.ProvidersTable}
      dataFieldName="providers"
      mapData={(data: ProviderResult) => ({
        ...data,
        type: formatTypes(data.type),
      })}
    />
  );
}
