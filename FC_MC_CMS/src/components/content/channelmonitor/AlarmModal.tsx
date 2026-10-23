import React from 'react';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';
import { Channel, ChannelAlarms } from '@/domain/entities/content/channelMonitor';

interface AlarmModalProps {
  isOpen: boolean;
  onMoreAlarms: () => void;
  onClose: () => void;
  channel: Channel;
  type: 'Primary' | 'Backup';
  alarms: ChannelAlarms[];
}

interface Alarm {
  title: string;
  message: string;
  timestamp: string[];
}

export default function AlarmModal({
  isOpen,
  onMoreAlarms,
  onClose,
  channel,
  type,
  alarms,
}: AlarmModalProps) {
  // Find the relevant flow ARN based on the type
  const relevantFlow = channel.flows.length === 1
    ? channel.flows[0]
    : channel.flows.find((flow) => (
      type === 'Primary'
        ? !flow.flowARN?.toLowerCase().includes('backup') && !flow.flowARN?.toLowerCase().includes('nextologies')
        : flow.flowARN?.toLowerCase().includes('backup') || flow.flowARN?.toLowerCase().includes('nextologies')
    ));

  const channelAlarms = alarms.find((alarm) => alarm.channel === relevantFlow?.flowName);
  const relevantAlarms: Alarm[] = (() => {
    if (!channelAlarms?.alarms) return [];
    return Array.isArray(channelAlarms.alarms) ? channelAlarms.alarms : [channelAlarms.alarms];
  })();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={modalStyles}
      ariaHideApp={false}
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold">
          {`${channel.name} ${type} Channel Alarms`}
        </h3>
        <div className="flex flex-col gap-2">
          <div>
            <span className="font-semibold">Status: </span>
            <span className={relevantFlow?.flowConnected ? 'text-green-500' : 'text-red-500'}>
              {relevantFlow?.flowConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        {relevantAlarms.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-2">Alarms</h4>
            <div className="max-h-[700px] max-w-[1400px] overflow-x-auto">
              <table className="min-w-full border-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Event Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {relevantAlarms.map((alarm: Alarm, index: number) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={`${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{alarm.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{alarm.message}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{alarm.timestamp.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-gray-500">
            No alarms found for this channel.
          </div>
        )}

        <div className="flex flex-row justify-end gap-3">
          <button type="button" className="mt-4 bg-blue px-4 py-2 rounded-xl self-end" onClick={onMoreAlarms}>
            More Alarms
          </button>
          <button type="button" className="mt-4 bg-gray-light px-4 py-2 rounded-xl self-end" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
