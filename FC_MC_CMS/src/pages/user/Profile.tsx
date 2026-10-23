import React, { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import { Nav } from '@components/index';
import { EditPassword } from '@components/user';
import ActivityLog from '@components/user/ActivityLog';

function ProfilePage() {
  const [username, setUsername] = useState<string>('');
  useEffect(() => {
    (async () => {
      const user = await Auth.currentAuthenticatedUser();
      setUsername(user.attributes.email);
    })();
  });

  const onLogout = async () => {
    await Auth.signOut();
  };

  return (
    <Nav.Content title="User Profile">
      <div className="">
        <div>
          {username}
          <div className="flex flex-row gap-8">
            <EditPassword />
            <button className="px-3 py-1 !w-48 bg-gray hover:bg-gray-light rounded-xl" onClick={onLogout} type="button">Logout</button>
          </div>
        </div>
        <div className="flex flew-row mt-16">
          <ActivityLog />
        </div>
      </div>
    </Nav.Content>
  );
}

export default ProfilePage;
