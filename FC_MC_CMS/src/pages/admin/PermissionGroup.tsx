import React from 'react';
import { Admin } from '@components/index';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { PackageResult } from '@entities/configurations/package';
import { PermissionGroups } from '@api/index';

interface PermissionGroupsPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function PermissionGroupsPage({ action }: PermissionGroupsPageProps) {
  return (
    <EntityModalFormTablePage<PackageResult>
      action={action}
      useData={PermissionGroups.usePermissionGroups}
      title="PermissionGroups"
      desc="List of permissions groups"
      Form={Admin.PermissionGroupForm}
      Table={Admin.PermissionGroupsTable}
      dataFieldName="permissionsGroups"
    />
  );
}
