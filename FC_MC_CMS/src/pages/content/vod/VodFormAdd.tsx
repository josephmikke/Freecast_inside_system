import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Nav, Content } from '@components/index';

export default function VodFormAdd() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('type') === null || !searchParams.get('type')) {
      searchParams.set('type', 'movies');
    }
  }, []);

  return (
    <Nav.Content
      title="Vod"
      desc={`Add a ${searchParams.get('type') === 'shows' ? 'Show' : 'Movie'}.`}
    >
      {searchParams.get('type') === 'shows' && (
        <Content.VodForm action="add" refetch={() => {}} />
      )}
      {searchParams.get('type') === 'movies' && (
        <Content.VodForm action="add" refetch={() => {}} />
      )}
    </Nav.Content>
  );
}
