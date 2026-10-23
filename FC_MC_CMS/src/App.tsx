import React from 'react';
import {
  Routes,
  Route,
  Outlet, useNavigate,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
} from 'react-query';
import { ToastContainer } from 'react-toastify';
import { Hub } from 'aws-amplify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Provider } from 'react-redux';
import {
  Auth,
  User,
  Admin,
  Content,
  Configurations,
  Reporting,
} from '@pages/index';
import protectedRoute from '@pages/auth/protectedRoute';
import { Nav } from './components/index';
import { store } from './store';

function Layout() {
  return (
    <div id="app">
      <Nav.Menu />
      <Outlet />
    </div>
  );
}

const WrappedLayout = protectedRoute(Layout);

export default function App() {
  const navigate = useNavigate();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  Hub.listen('auth', (data) => {
    if (data.payload.event === 'signOut') {
      navigate('/auth/login');
      localStorage.removeItem('apiKey');
      localStorage.removeItem('userEmail');
    }
  });

  return (
    <Provider store={store}>
      <ToastContainer
        theme="dark"
        position="bottom-right"
        autoClose={5000}
        closeOnClick
      />
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<WrappedLayout />}>
            <Route index path="user" element={<User.Profile />} />
            <Route path="content/*" element={<Content.Router />} />
            <Route path="reporting/*" element={<Reporting.Router />} />
            <Route path="configurations/*" element={<Configurations.Router />} />
            <Route path="admin/*" element={<Admin.Router />} />
            <Route path="*" element={<Nav.NoContent />} />
          </Route>
          <Route path="/auth">
            <Route path="login" element={<Auth.Login />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </Provider>
  );
}
