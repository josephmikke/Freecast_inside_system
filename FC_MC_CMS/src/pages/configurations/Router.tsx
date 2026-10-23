import React from 'react';
import {
  Routes,
  Route,
} from 'react-router-dom';
import GeoIpRules from '@pages/configurations/GeoIPRules';
import Packages from '@pages/configurations/Packages';
import Providers from '@pages/configurations/Providers';
import Platforms from '@pages/configurations/Platforms';
import Categories from '@pages/configurations/Categories';
import Genres from '@pages/configurations/Genres';
import Locations from '@pages/configurations/Locations';
import { Nav } from '@components/index';

function ConfigurationsRouter() {
  return (
    <Routes>
      <Route index path="*" element={<Nav.NoContent />} />
      <Route path="geoiprules" element={<GeoIpRules action="list" />} />
      <Route path="geoiprules/add" element={<GeoIpRules action="add" />} />
      <Route path="geoiprules/:id/edit" element={<GeoIpRules action="edit" />} />
      <Route path="packages" element={<Packages action="list" />} />
      <Route path="packages/add" element={<Packages action="add" />} />
      <Route path="packages/:id/edit" element={<Packages action="edit" />} />
      <Route path="providers" element={<Providers action="list" />} />
      <Route path="providers/add" element={<Providers action="add" />} />
      <Route path="providers/:id/edit" element={<Providers action="edit" />} />
      <Route path="platforms" element={<Platforms action="list" />} />
      <Route path="platforms/add" element={<Platforms action="add" />} />
      <Route path="platforms/:id/edit" element={<Platforms action="edit" />} />
      <Route path="categories" element={<Categories action="list" />} />
      <Route path="categories/add" element={<Categories action="add" />} />
      <Route path="categories/:id/edit" element={<Categories action="edit" />} />
      <Route path="genres" element={<Genres action="list" />} />
      <Route path="genres/add" element={<Genres action="add" />} />
      <Route path="genres/:id/edit" element={<Genres action="edit" />} />
      <Route path="locations" element={<Locations action="list" />} />
      <Route path="locations/add" element={<Locations action="add" />} />
      <Route path="locations/:id/edit" element={<Locations action="edit" />} />
    </Routes>
  );
}

export default ConfigurationsRouter;
