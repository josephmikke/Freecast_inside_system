import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

interface LoadAllButtonProps {
  onClick: (e: any) => void | undefined;
  loading: boolean | undefined;
  disabled: boolean | undefined;
}

export default function LoadAllButton({
  onClick,
  loading = false,
  disabled = false,
}: LoadAllButtonProps) {
  return (
    <button type="button" className="bg-blue ml-4 px-4 rounded-sm w-[120px]" onClick={onClick} disabled={disabled}>
      {
        loading
          ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="mr-2 spinner" />
              Loading
            </>
          )
          : (
            <>
              <FontAwesomeIcon icon={faBolt} className="mr-2" />
              Load All
            </>
          )
      }
    </button>
  );
}
