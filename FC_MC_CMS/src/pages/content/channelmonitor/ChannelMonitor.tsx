import React, { useEffect } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useDispatch, useSelector } from 'react-redux';
import EntityMultiViewFormPage from '@pages/common/EntityMultiViewFormPage';
import { Content } from '@components/index';
import { ChannelMonitorResult } from '@entities/content/channelMonitor';
import { AppDispatch, RootState } from '@/store';
import { fetchChannels } from '@/store/slices/channelMonitorSlice';

interface ChannelMonitorPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function ChannelMonitorPage({ action }: ChannelMonitorPageProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    channels,
    alarms,
    loading,
    error,
  } = useSelector((state: RootState) => state.channelMonitor);

  useEffect(() => {
    dispatch(fetchChannels());

    const intervalId = setInterval(() => {
      dispatch(fetchChannels());
    }, 300000);

    return () => clearInterval(intervalId);
  }, [dispatch]);

  const useChannelData = () => ({
    data: { data: { channels, alarms } },
    error,
    isFetching: loading,
    refetch: () => {
      dispatch(fetchChannels());
    },
  });

  return (
    <EntityMultiViewFormPage<ChannelMonitorResult>
      action={action}
      useData={useChannelData}
      title=""
      desc=""
      Form={Content.ChannelMonitorForm}
      Grid={Content.ChannelMonitorGrid}
      dataFieldName="channels"
      mapData={(data: ChannelMonitorResult) => ({
        ...data,
      })}
    />
  );
}
