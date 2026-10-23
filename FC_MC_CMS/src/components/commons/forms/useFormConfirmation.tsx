import { useState } from 'react';

export default function useFormConfirmation(action: 'add' | 'edit') {
  const [formConfirmationState, setFormConfirmationState] = useState<'form' | 'confirmation'>('form');
  const [loading, setLoading] = useState<boolean>(false);

  const withConfirmation = async (onSubmit: () => Promise<void>) => {
    if (formConfirmationState === 'form' && action === 'edit') {
      setFormConfirmationState('confirmation');
    } else {
      setLoading(true);
      await onSubmit();
      setLoading(false);
    }
  };

  return {
    loading,
    formConfirmationState,
    setFormConfirmationState,
    withConfirmation,
  };
}
