import React from 'react';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';
import CustomLoader from '@/components/commons/CustomLoader';

interface ConfirmDeleteEPGModalProps {
  isOpen: boolean;
  onRemoveConfirm: () => void;
  onKeepConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteEPGModal({
  isOpen,
  onRemoveConfirm,
  onKeepConfirm,
  loading = false,
}: ConfirmDeleteEPGModalProps) {
  return (
    <Modal
      ariaHideApp={false}
      isOpen={isOpen}
      onRequestClose={onRemoveConfirm}
      style={modalStyles}
    >
      <div className="mb-4">
        <span>
          Do you want to delete the Old EPGs?
        </span>
      </div>
      <div className="flex flex-row justify-center gap-8 items-center w-full">
        <button
          type="button"
          className="bg-red px-4 py-2 rounded-xl"
          onClick={onRemoveConfirm}
          disabled={loading}
        >
          {loading ? <CustomLoader contained={false} size={20} /> : 'Yes'}
        </button>
        <button
          type="button"
          className="bg-gray-light px-4 py-2 rounded-xl"
          onClick={onKeepConfirm}
          disabled={loading}
        >
          No
        </button>
      </div>
    </Modal>
  );
}
