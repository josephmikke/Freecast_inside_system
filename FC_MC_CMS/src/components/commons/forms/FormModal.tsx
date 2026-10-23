import React, { ReactNode } from 'react';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';

interface FormModalProps {
  isOpen: boolean;
  children: ReactNode;
  onRequestClose: () => void;
}

export default function FormModal({ isOpen, children, onRequestClose }: FormModalProps) {
  Modal.setAppElement('#app');

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={modalStyles}
    >
      {children}
    </Modal>
  );
}
