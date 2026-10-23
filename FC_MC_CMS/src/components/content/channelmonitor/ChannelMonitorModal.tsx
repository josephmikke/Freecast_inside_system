/* eslint-disable react/button-has-type */
import React from 'react';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';
import { Channel } from '@/domain/entities/content/channelMonitor';

interface ChannelMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  type: 'Primary' | 'Backup';
}

export default function ChannelMonitorModal({
  isOpen,
  onClose,
  channel,
  type,
}: ChannelMonitorModalProps) {
  // eslint-disable-next-line max-len
  const relevantFlow = channel.flows.length === 1 ? channel.flows[0] : channel.flows.find((flow) => (
    type === 'Primary'
      ? !flow.flowName?.toLowerCase().includes('backup') && !flow.flowName?.toLowerCase().includes('nextologies')
      : flow.flowName?.toLowerCase().includes('backup') || flow.flowName?.toLowerCase().includes('nextologies')),
  // eslint-disable-next-line function-paren-newline
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={modalStyles}
      ariaHideApp={false}
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold">
          {type}
          {' '}
          Channel Information
        </h3>
        <div className="flex flex-col gap-2">
          <div>
            <span className="font-semibold">Channel Name: </span>
            <span>{channel.name}</span>
          </div>
          <div>
            <span className="font-semibold">Status: </span>
            <span className={relevantFlow?.flowConnected ? 'text-green-500' : 'text-red-500'}>
              {relevantFlow?.flowConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {relevantFlow?.flowARN && (
            <div>
              <span className="font-semibold">Flow ARN: </span>
              <span className="break-all">{relevantFlow.flowARN}</span>
            </div>
          )}
        </div>
        <button className="mt-4 bg-gray-light px-4 py-2 rounded-xl self-end" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
