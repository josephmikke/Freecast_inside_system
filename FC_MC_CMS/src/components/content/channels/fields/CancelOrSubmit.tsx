import React from 'react';

interface CancelOrSubmitProps {
  action: 'add' | 'edit';
  goBack: () => void;
  onConfirm: () => void;
}

export default function CancelOrSubmit({ action, onConfirm, goBack }: CancelOrSubmitProps) {
  return (
    <div className="flex gap-4 flex-row">
      <button
        className="flex justify-center items-center bg-gray-light rounded-xl w-48 h-10"
        type="button"
        onClick={goBack}
      >
        Cancel
      </button>
      <button
        className={`${action === 'edit' ? 'bg-blue' : 'bg-green'} flex justify-center items-center rounded-xl w-48 h-10`}
        type="button"
        onClick={onConfirm}
      >
        {action === 'edit' ? 'Save' : 'Add'}
      </button>
    </div>
  );
}
