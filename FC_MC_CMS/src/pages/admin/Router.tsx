import React from 'react';
import {
  Routes,
  Route,
} from 'react-router-dom';
import { Nav } from '@components/index';
import PermissionGroups from '@pages/admin/PermissionGroup';
import ChangeLogs from '@pages/admin/ChangeLog';
import MenuItems from '@pages/admin/MenuItem';
import Users from '@pages/admin/User';
import Logs from '@pages/admin/Log';

function AdminRouter() {
  return (
    <Routes>
      <Route index path="*" element={<Nav.NoContent />} />
      <Route path="permissions-groups" element={<PermissionGroups action="list" />} />
      <Route path="permissions-groups/add" element={<PermissionGroups action="add" />} />
      <Route path="permissions-groups/:id/edit" element={<PermissionGroups action="edit" />} />
      <Route path="users" element={<Users action="list" />} />
      <Route path="users/add" element={<Users action="add" />} />
      <Route path="users/:id/edit" element={<Users action="edit" />} />
      <Route path="changelogs" element={<ChangeLogs />} />
      <Route path="menuitems" element={<MenuItems />} />
      <Route path="logs" element={<Logs />} />
    </Routes>
  );
}

export default AdminRouter;
