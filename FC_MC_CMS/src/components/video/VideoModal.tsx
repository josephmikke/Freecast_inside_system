import React from 'react';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';
import { StreamFormat } from '@entities/content/stream';
import DRMHLSVideo from '@components/video/DRMHLSVideo';
import HLSVideo from '@components/video/HLSVideo';
import DRMDashVideo from '@components/video/DRMDashVideo';
import DashVideo from '@components/video/DashVideo';

interface VideoModalProps {
  url: string;
  format: StreamFormat;
  index: number;
  onClose: (e: any) => void;
}

export default function VideoModal({
  format, url, index, onClose,
}: VideoModalProps) {
  return (
    <Modal
      isOpen={index >= 0}
      onRequestClose={onClose}
      ariaHideApp={false}
      style={modalStyles}
    >
      {format === 'DASH' && <DashVideo url={url} />}
      {format === 'HLS' && <HLSVideo url={url} />}
      {format === 'DASH_DRM' && <DRMDashVideo url={url} />}
      {format === 'HLS_DRM' && <DRMHLSVideo url={url} />}
    </Modal>
  );
}
