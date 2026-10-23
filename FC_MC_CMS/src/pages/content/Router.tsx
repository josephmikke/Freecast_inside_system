import React from 'react';
import {
  Routes,
  Route,
} from 'react-router-dom';
import { Nav } from '@components/index';
import EpgTemplates from '@pages/content/epgtemplates/EpgTemplates';
import ChannelFormAdd from '@pages/content/channels/ChannelFormAdd';
import ChannelsList from '@pages/content/channels/ChannelsList';
import VodsList from '@pages/content/vod/VodsList';
import VodFormAdd from '@pages/content/vod/VodFormAdd';
import VodFormEdit from '@pages/content/vod/VodFormEdit';
import ChannelFormEdit from '@pages/content/channels/ChannelFormEdit';
import IngestionsPage from '@components/content/ingestions/IngestionsPage';
import ChannelMonitorPage from '@/pages/content/channelmonitor/ChannelMonitor';

function ContentRouter() {
  return (
    <Routes>
      <Route index path="*" element={<Nav.NoContent />} />
      <Route path="channels" element={<ChannelsList />} />
      <Route path="channels/add" element={<ChannelFormAdd />} />
      <Route path="channels/:id/edit" element={<ChannelFormEdit />} />
      <Route path="vod" element={<VodsList />} />
      <Route path="vod/add" element={<VodFormAdd />} />
      <Route path="vod/:id/edit" element={<VodFormEdit />} />
      <Route path="epgtemplates" element={<EpgTemplates action="list" />} />
      <Route path="epgtemplates/add" element={<EpgTemplates action="add" />} />
      <Route path="epgtemplates/:id/edit" element={<EpgTemplates action="edit" />} />
      <Route path="ingestions/" element={<IngestionsPage action="list" />} />
      <Route path="ingestions/:id/edit" element={<IngestionsPage action="edit" />} />
      <Route path="ingestions/add" element={<IngestionsPage action="add" />} />
      <Route path="channelmonitor" element={<ChannelMonitorPage action="list" />} />
    </Routes>
  );
}

export default ContentRouter;
