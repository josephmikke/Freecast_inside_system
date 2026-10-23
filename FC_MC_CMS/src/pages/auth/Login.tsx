import React, { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify, Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './login.css';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ApiKey } from '@/api';

Amplify.configure(
  {
    Auth: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      region: process.env.REACT_APP_REGION,
      userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    },
  },
);

function ApiKeyAndNavigate() {
  async function onError() {
    toast.error('Unable to get API key');
    await Auth.signOut();
  }

  useEffect(() => {
    (async () => {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      try {
        const { data } = await ApiKey.getApiKey(token);
        if (!data.apiKey) {
          await onError();
          return;
        }
        const user = await Auth.currentAuthenticatedUser();
        localStorage.setItem('apiKey', data.apiKey);
        localStorage.setItem('userEmail', user.attributes.email);
      } catch (error) {
        await onError();
      }
    })();
  }, []);

  return (
    <Navigate to="/" />
  );
}

export default function Login() {
  return (
    <div className="flex w-full h-[100vh] justify-center items-center">
      <Authenticator hideSignUp>
        {() => (
          <ApiKeyAndNavigate />
        )}
      </Authenticator>
    </div>
  );
}
