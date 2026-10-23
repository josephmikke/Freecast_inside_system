import React, { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store'; // You'll need to create these types
import { fetchChannels } from '@/store/slices/channelMonitorSlice';
import { Channel, ChannelAlarms } from '@/domain/entities/content/channelMonitor';
// import { deleteChannel } from '@/api/channelMonitor';
import useChannelMonitorItems from './useChannelMonitorItems';

interface ChannelMonitorGridProps {
  SortersComponent?: any;
  Sorter?: any;
}

export default function ChannelMonitorGrid({
  SortersComponent,
  Sorter,
}: ChannelMonitorGridProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { channels, alarms } = useSelector((state: RootState) => state.channelMonitor);
  const [items, setItems] = useState<{ id: string, content: JSX.Element }[]>([]);

  // const formatListItems = useChannelMonitorItems({
  //   onClickTrash: async (event, item) => {
  //     event.stopPropagation();
  //     try {
  //       await deleteChannel(String(item.id));
  //     } catch (error) {
  //       console.error('Error deleting channel:', error);
  //     }
  //   },
  // });

  function modifyItems(
    channelData: Channel[],
    alarmData: ChannelAlarms[] | [],
    playerMounted: boolean,
  ) {
    const formatListItems = useChannelMonitorItems();
    const formatedItems = formatListItems(channelData, alarmData, playerMounted);
    return formatedItems;
  }

  useEffect(() => {
    dispatch(fetchChannels());
    const interval = setInterval(() => {
      dispatch(fetchChannels());
    }, 180000); // 3 minutes refresh

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    modifyItems([], [], false);
    setTimeout(() => {
      setItems(modifyItems(channels || [], alarms || [], true));
    }, 100);
  }, [channels, alarms]);

  if (!channels) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {SortersComponent && Sorter && (
        <SortersComponent
          Sorter={Sorter}
          setSortBy={(sortOptions: { id: string, desc: boolean }[]) => {
            if (sortOptions.length > 0) {
              const sortOption = sortOptions[0];
              const sortedChannels = [...channels].sort((first: Channel, second: Channel) => {
                if (sortOption.desc) {
                  // @ts-ignore
                  return first[sortOption.id] > second[sortOption.id] ? -1 : 1;
                }
                // @ts-ignore
                return first[sortOption.id] > second[sortOption.id] ? 1 : -1;
              });
              setItems(modifyItems(sortedChannels, alarms || [], true));
            }
          }}
        />
      )}
      <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-w-8xl mx-auto px-4">
        {items.map((item) => <div key={item.id}>{item.content}</div>)}
      </div>
    </div>
  );
}
