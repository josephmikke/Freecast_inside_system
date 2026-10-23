import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import infoIcon from '@assets/icons/info.png';
import { AppDispatch } from '@/store';
import { Channel, ChannelAlarms } from '@/domain/entities/content/channelMonitor';
import MultiVideo from '@/components/video/MultiVideo';
import { fetchChannelAlarm } from '@/store/slices/channelMonitorSlice';
import AlarmModal from './AlarmModal';

interface ChannelMonitorItemProps {
  item: Channel;
  alarms?: ChannelAlarms[] | [];
  index: number;
  playerMounted: boolean;
}

// eslint-disable-next-line max-len
export default function ChannelMonitorItem({
  item,
  alarms,
  index,
  playerMounted,
}: ChannelMonitorItemProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [modalType, setModalType] = useState<'Primary' | 'Backup' | null>(null);

  const getChannelAlarm = async (_item: Channel, channelType: 'Primary' | 'Backup' | null) => {
    if (_item.flows.length === 2 && channelType === 'Backup') {
      // eslint-disable-next-line max-len, @typescript-eslint/no-shadow
      dispatch(fetchChannelAlarm(_item.flows.filter((item) => item.flowName.toLocaleLowerCase().includes('backup') || item.flowName.toLocaleLowerCase().includes('nextologies'))[0].flowName));
      // await getAlarm(_item.flows[1].flowName);
    } else if (_item.flows.length === 2 && channelType === 'Primary') {
      // eslint-disable-next-line max-len, @typescript-eslint/no-shadow
      dispatch(fetchChannelAlarm(_item.flows.filter((item) => !item.flowName.toLocaleLowerCase().includes('backup') && !item.flowName.toLocaleLowerCase().includes('nextologies'))[0].flowName));
      // await getAlarm(_item.flows[0].flowName);
    } else if (_item.flows.length) {
      dispatch(fetchChannelAlarm(_item.flows[0].flowName));
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-2 h-7" id={`${index}`}>
        <span className="text-base font-bold text-gray-900">{item.name}</span>
        <div className="flex justify-between gap-2">
          <div
            className="flex flex-row justify-center border-2 p-1 rounded-lg cursor-pointer gap-1"
            style={
              // eslint-disable-next-line no-nested-ternary
              item.flows.length !== 2 && item.active === 'Primary'
                ? { borderColor: 'green', backgroundColor: 'green' }
                // eslint-disable-next-line @typescript-eslint/no-shadow, no-nested-ternary
                : item.active === 'Primary' && item.flows.filter((item) => !item.flowARN?.toLowerCase().includes('backup') && !item.flowARN?.toLowerCase().includes('nextologies'))[0]?.flowConnected
                  ? { borderColor: 'green', backgroundColor: 'green' }
                  // eslint-disable-next-line @typescript-eslint/no-shadow, no-nested-ternary
                  : item.active === 'Primary' || item.flows.filter((item) => !item.flowARN?.toLowerCase().includes('backup') && !item.flowARN?.toLowerCase().includes('nextologies'))[0]?.flowConnected ? { borderColor: 'green' } : { borderColor: 'red' }
            }
            onClick={() => setModalType('Primary')}
          >
            <span className="my-auto font-medium text-gray-900 text-sm">
              Primary
            </span>
            <img className="h-7" src={infoIcon} alt="info" />
          </div>
          {item?.flows.length === 2
            ? (
              <div
                className="flex flex-row justify-center border-2 p-1 rounded-lg cursor-pointer gap-1"
                style={
                  // eslint-disable-next-line @typescript-eslint/no-shadow, no-nested-ternary
                  item.active === 'Backup' && item.flows.filter((item) => item.flowARN?.toLowerCase().includes('backup') || item.flowARN?.toLowerCase().includes('nextologies'))[0]?.flowConnected
                    ? { borderColor: 'green', backgroundColor: 'green' }
                    // eslint-disable-next-line @typescript-eslint/no-shadow, no-nested-ternary
                    : item.active === 'Backup' || item.flows.filter((item) => item.flowARN?.toLowerCase().includes('backup') || item.flowARN?.toLowerCase().includes('nextologies'))[0]?.flowConnected ? { borderColor: 'green' } : { borderColor: 'red' }
                }
                onClick={() => setModalType('Backup')}
              >
                <span className="my-auto font-medium text-gray-900 text-sm">Backup</span>
                <img className="h-7" src={infoIcon} alt="info" />
              </div>
            )
            // eslint-disable-next-line react/jsx-no-useless-fragment
            : <></>}
        </div>
      </div>
      {item.streamUrl && playerMounted && (
        <div className="mb-4 relative w-full max-w-4xl aspect-video bg-gray-100">
          <MultiVideo url={item.streamUrl} />
        </div>
        // eslint-disable-next-line react/jsx-no-useless-fragment
      )}
      <AlarmModal
        isOpen={modalType !== null}
        onMoreAlarms={() => getChannelAlarm(item, modalType)}
        onClose={() => setModalType(null)}
        channel={item}
        type={modalType || 'Primary'}
        alarms={alarms || []}
      />
    </>
  );
}
