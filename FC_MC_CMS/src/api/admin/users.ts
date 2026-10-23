import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'users';

// const getUsers = async () => api.get(BASE_URL);
async function getUsers() {
  return {
    data: {
      users: [{
        name: 'John Doe',
        enabled: false,
        id: 'id1',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'John Doe _1',
        enabled: true,
        id: 'id2',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'John Doe _2',
        enabled: true,
        id: 'id3',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'John Doe _3',
        enabled: true,
        id: 'id4',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'John Doe _4',
        enabled: true,
        id: 'id5',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }, {
        name: 'John Doe _5',
        enabled: false,
        id: 'id1',
        updatedAt: '2023-04-06T15:30:03.856Z',
        createdAt: '2023-04-06T15:30:03.856Z',
      }],
    },
  };
}
const getUser = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addUser = async (data: any) => api.post(BASE_URL, data);
const updateUser = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteUser = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useUsers = () => useQuery('users', getUsers);
const useUser = (id: string) => useQuery(['user', id], () => getUser(id));

export {
  getUsers,
  getUser,
  addUser,
  updateUser,
  deleteUser,
  useUser,
  useUsers,
};
