import React from 'react';
import { Content, Nav } from '@components/index';

export default function ChannelFormAdd() {
  return (
    <Nav.Content
      title="Channels"
      desc="Add Channel"
    >
      <Content.ChannelForm action="add" refetch={() => {}} />
    </Nav.Content>
  );
}
