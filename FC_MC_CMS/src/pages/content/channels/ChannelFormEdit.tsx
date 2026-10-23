import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Nav } from '@components/index';
import { ChannelResult } from '@entities/content/channel';
import { useChannel } from '@api/channels';
import { mapChannelToItem } from '@entities/content/mapChannel';
import CustomLoader from '@components/commons/CustomLoader';

export default function ChannelFormEdit() {
  const { id } = useParams();
  const { data: dataItem, refetch: refetchItem, isFetching } = useChannel(id!);

  let item: ChannelResult | undefined;

  if (dataItem && dataItem.data) {
    item = mapChannelToItem(dataItem.data);
  }

  useEffect(() => {
    if (id && !dataItem) {
      refetchItem();
    }
  }, [id, dataItem]);

  return (
    <Nav.Content
      title="Channels"
      desc="Edit Channel"
    >
      {isFetching && (
        <div className="top-0 left-0 w-[100vw] h-[100vh] absolute">
          <CustomLoader />
        </div>
      )}
      <Content.ChannelForm action="edit" refetch={window.location.reload} onTriggered={refetchItem} data={item} id={id} />
    </Nav.Content>
  );
}
