import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomLoader from '@components/commons/CustomLoader';

interface CancelOrSubmitFormProps {
  action: 'add' | 'edit';
  loading?: boolean;
}

export default function CancelOrSubmitForm({ action, loading = false }: CancelOrSubmitFormProps) {
  const navigate = useNavigate();
  const submitLabel = action === 'edit' ? 'Save' : 'Add';
  return (
    <div className="flex flex-row justify-center gap-4">
      <button
        type="button"
        className="rounded-xl p-2 bg-gray-light w-32"
        onClick={() => navigate(-1)}
      >
        Cancel
      </button>
      <button
        disabled={loading}
        className={`${action === 'edit' ? '!bg-blue' : 'bg-green'} justify-center items-center flex rounded-xl p-2 w-32`}
        type="submit"
      >
        {loading ? <CustomLoader contained={false} size={30} /> : submitLabel}
      </button>
    </div>
  );
}
