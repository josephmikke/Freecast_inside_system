import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import { PermissionGroups } from '@/api';
import usePermissionGroupColumns from '@components/admin/permissionGroup/usePermissionGroupsColumns';

interface PermissionGroupTableProps {
  data: any;
  refetch: () => void;
}

export default function PermissionGroupsTable({ data, refetch }: PermissionGroupTableProps) {
  return (
    <CustomTable
      data={data}
      refetch={refetch}
      entityName="PermissionGroup"
      useColumns={usePermissionGroupColumns}
      deleteEntity={PermissionGroups.deletePermissionGroup}
      updateEntity={PermissionGroups.updatePermissionGroup}
      getEditPath={(id: string) => `/admin/permissions-groups/${id}/edit`}
    />
  );
}
