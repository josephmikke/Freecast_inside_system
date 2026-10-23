import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStop } from '@fortawesome/free-solid-svg-icons';

interface StopButtonProps {
  onClick: (e: any) => void | undefined;
  disabled?: boolean;
}

export default function StopButton({
  onClick,
  disabled = false,
}: StopButtonProps) {
  return (
    <button type="button" className="bg-red ml-4 px-4 rounded-sm w-[120px]" onClick={onClick} disabled={disabled}>
      <FontAwesomeIcon icon={faStop} className="mr-2" />
      Stop
    </button>
  );
}
