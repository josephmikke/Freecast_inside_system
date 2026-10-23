import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Nav } from '@components/index';
import VodsListMovie from '@pages/content/vod/VodsListMovie';
import VodsListShow from '@pages/content/vod/VodsListShow';

export default function VodsList() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('type') === null || !searchParams.get('type')) {
      searchParams.set('type', 'movies');
    }
  }, []);

  return (
    <Nav.Content title="Vod">
      {searchParams.get('type') === 'movies' && (
        <VodsListMovie />
      )}
      {searchParams.get('type') === 'shows' && (
        <VodsListShow />
      )}
    </Nav.Content>
  );
}
