import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Nav } from '@components/index';

import VodFormEditMovie from '@pages/content/vod/VodFormEditMovie';
import VodFormEditSerie from '@pages/content/vod/VodFormEditSerie';

export default function VodFormEdit() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('type') === null || !searchParams.get('type')) {
      searchParams.set('type', 'movies');
    }
  }, []);

  return (
    <Nav.Content
      title="Vod"
      desc={`Edit a ${searchParams.get('type') === 'movies' ? 'Movie' : 'Show'}`}
    >
      {searchParams.get('type') === 'shows' && (
        <VodFormEditSerie />
      )}
      {searchParams.get('type') === 'movies' && (
        <VodFormEditMovie />
      )}
    </Nav.Content>
  );
}
