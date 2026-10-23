import React, { useState } from 'react';
import Modal from 'react-modal';
import defaultTrash from '@assets/icons/delete-default-state.png';
import hoverTrash from '@assets/icons/delete-hover-state.png';
import CustomLoader from '@components/commons/CustomLoader';
import modalStyles from '@/styles/modalStyles';

interface TrashCellProps {
  onClick: (event: React.MouseEvent<any>) => Promise<any>;
  entityName: string;
  ignoreConfirm?: boolean;
}

export default function TrashCell({ onClick, entityName, ignoreConfirm }: TrashCellProps) {
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const onClickTrash = async (event: React.MouseEvent<any>) => {
    event.stopPropagation();
    if (!ignoreConfirm) {
      setModalIsOpen(true);
    } else {
      setLoading(true);
      await onClick(event);
      setLoading(false);
    }
  };

  const closeModal = (event: React.MouseEvent<any>) => {
    event.stopPropagation();
    setModalIsOpen(false);
  };

  const onClickConfirm = async (event: React.MouseEvent<any>) => {
    event.stopPropagation();
    setLoading(true);
    await onClick(event);
    setLoading(false);
    setModalIsOpen(false);
  };

  if (loading) {
    return <CustomLoader contained={false} size={30} />;
  }

  return (
    <div onClick={onClickTrash}>
      <img
        src={defaultTrash}
        onFocus={() => { }}
        onBlur={() => { }}
        onMouseOver={(e) => { e.currentTarget.src = hoverTrash; }}
        onMouseOut={(e) => { e.currentTarget.src = defaultTrash; }}
        alt="trash"
      />
      <Modal
        ariaHideApp={false}
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={modalStyles}
      >
        <div className="mb-4">
          <span>
            Confirm you want to delete this
            {' '}
            {entityName}
          </span>
        </div>
        <div className="flex flex-row justify-center gap-8 items-center w-full">
          <button type="button" className="bg-red px-4 py-2 rounded-xl" onClick={onClickConfirm}>Delete</button>
          <button type="button" className="bg-gray-light px-4 py-2 rounded-xl" onClick={closeModal}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
