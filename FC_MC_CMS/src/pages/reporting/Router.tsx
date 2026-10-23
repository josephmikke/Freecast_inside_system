import React from 'react';
import {
  Routes,
  Route,
} from 'react-router-dom';
import { Nav } from '@components/index';
import LiveDashboard from '@pages/reporting/LiveDashboard';
import Reports from '@pages/reporting/Reports';

function ReportingRouter() {
  return (
    <Routes>
      <Route index path="*" element={<Nav.NoContent />} />
      <Route path="livedashboard" element={<LiveDashboard />} />
      <Route path="reports" element={<Reports />} />
    </Routes>
  );
}

export default ReportingRouter;
