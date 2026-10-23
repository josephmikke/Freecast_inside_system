import React from 'react';
import { Channel, ChannelAlarms } from '@/domain/entities/content/channelMonitor';
import ChannelMonitorItem from './ChannelMonitorItem';

export default function useChannelMonitorItems() {
  return function formatListItems(
    data: Channel[],
    alarm: ChannelAlarms[] | [],
    playerMounted: boolean,
  ) {
    if (!data || !Array.isArray(data)) {
      // eslint-disable-next-line
      console.warn('Invalid data passed to formatListItems:', data);
      return [];
    }

    return data.map((item, index) => ({
      id: String(item.id),
      content: <ChannelMonitorItem
        item={item}
        // eslint-disable-next-line max-len
        alarms={alarm?.filter((alarmItem) => item.flows.some((flowItem) => flowItem.flowName === alarmItem.channel))}
        index={index}
        playerMounted={playerMounted}
      />,
    }));
  };
}
