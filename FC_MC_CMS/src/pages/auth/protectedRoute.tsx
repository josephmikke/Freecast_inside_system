import { Auth } from 'aws-amplify';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function protectedRoute(WrappedComponent: any) {
  return function HOC(props: any) {
    const navigate = useNavigate();

    useEffect(() => {
      (async () => {
        try {
          await Auth.currentAuthenticatedUser();
        } catch (e) {
          navigate('/auth/login');
        }
      })();
    });

    return <WrappedComponent {...props} />;
  };
}
