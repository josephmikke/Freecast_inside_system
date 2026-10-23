import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'permission-groups';

// const getPermissionGroups = async () => api.get(BASE_URL);
async function getPermissionGroups() {
  return {
    data: {
      permissionsGroups: [{
        name: 'Permission group 1',
        enabled: true,
        id: 'id1',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'Permission group 2',
        enabled: true,
        id: 'id2',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'Permission group 3',
        enabled: false,
        id: 'id3',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'Permission group 4',
        enabled: true,
        id: 'id4',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'Permission group 5',
        enabled: false,
        id: 'id5',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }],
    },
  };
}
const getPermissionGroup = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addPermissionGroup = async (data: any) => api.post(BASE_URL, data);
const updatePermissionGroup = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deletePermissionGroup = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const usePermissionGroups = () => useQuery('users', getPermissionGroups);
const usePermissionGroup = (id: string) => useQuery(['user', id], () => getPermissionGroup(id));

export {
  getPermissionGroups,
  getPermissionGroup,
  addPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
  usePermissionGroup,
  usePermissionGroups,
};
