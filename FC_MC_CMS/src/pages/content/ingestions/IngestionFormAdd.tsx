import React from 'react';
import { Content, Nav } from '@components/index';

export default function IngestionFormAdd() {
  return (
    <Nav.Content
      title="Ingestions"
      desc="Add Ingestion"
    >
      <Content.IngestionForm />
    </Nav.Content>
  );
}
