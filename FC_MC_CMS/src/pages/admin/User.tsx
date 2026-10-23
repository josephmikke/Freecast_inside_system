import React from 'react';
import { Admin } from '@components/index';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { PackageResult } from '@entities/configurations/package';
import { Users } from '@api/index';

interface UsersPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function UsersPage({ action }: UsersPageProps) {
  return (
    <EntityModalFormTablePage<PackageResult>
      action={action}
      useData={Users.useUsers}
      title="Users"
      desc="List of users"
      Form={Admin.UserForm}
      Table={Admin.UsersTable}
      dataFieldName="users"
    />
  );
}
