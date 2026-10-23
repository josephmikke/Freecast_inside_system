import Modal from 'react-modal';
import React from 'react';
import CustomLoader from '@components/commons/CustomLoader';
import modalStyles from '@/styles/modalStyles';

interface ConfirmModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  action: 'add' | 'edit';
  onConfirm: () => void;
  loading: boolean;
  name: string;
}

export default function ConfirmModal({
  isOpen,
  setIsOpen,
  action,
  onConfirm,
  loading,
  name,
}: ConfirmModalProps) {
  const submitLabel = action === 'edit' ? 'Save' : 'Add';
  return (
    <Modal
      style={modalStyles}
      ariaHideApp={false}
      isOpen={isOpen}
      onRequestClose={() => setIsOpen(false)}
    >
      <div className="flex flex-row mb-3">
        <h3>
          Confirm you want to save the edits for this
          {' '}
          {name}
        </h3>
      </div>
      <div className="flex gap-4 justify-center flex-row">
        <button
          className="flex justify-center items-center bg-gray-light rounded-xl w-48 h-10"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </button>
        <button
          className={`${action === 'edit' ? 'bg-blue' : 'bg-green'} flex justify-center items-center rounded-xl w-48 h-10`}
          type="submit"
          onClick={onConfirm}
        >
          {loading ? <CustomLoader contained={false} size={30} /> : submitLabel}
        </button>
      </div>
    </Modal>
  );
}
