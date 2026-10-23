import React, { ReactNode } from 'react';

interface ConfirmationModalContentProps {
  name: string;
  children: ReactNode;
  formConfirmationState: 'form' | 'confirmation';
}

export default function ConfirmationModalContent({
  name,
  formConfirmationState,
  children,
}: ConfirmationModalContentProps) {
  return (
    <>
      {formConfirmationState === 'confirmation' && (
        <div className="flex flex-row">
          <h3>
            Confirm you want to save the edits for this
            {' '}
            {name.toLowerCase()}
          </h3>
        </div>
      )}
      {formConfirmationState === 'form' && (
        children
      )}
    </>
  );
}
