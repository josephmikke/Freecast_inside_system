import React from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import { Users } from '@/api';
import useUsersColumns from '@components/admin/users/useUsersColumns';

interface UsersTableProps {
  data: any;
  refetch: () => void;
}

export default function UsersTable({ data, refetch }: UsersTableProps) {
  return (
    <CustomTable
      data={data}
      refetch={refetch}
      entityName="User"
      useColumns={useUsersColumns}
      deleteEntity={Users.deleteUser}
      updateEntity={Users.updateUser}
      getEditPath={(id: string) => `/admin/users/${id}/edit`}
    />
  );
}
