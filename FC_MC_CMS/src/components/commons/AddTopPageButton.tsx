import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePlus, faRefresh } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Link } from 'react-router-dom';

interface AddTopPageButtonProps {
  getLink?: (() => string);
  refresh?: boolean;
  refetch?: () => void;
}

export default function AddTopPageButton({
  getLink,
  refresh = false,
  refetch = () => {},
}: AddTopPageButtonProps) {
  return (
    <div className="top-btn-wrapper -mt-6">
      <div className="flex justify-end mb-3">
        {refresh && (
          <div className="mr-3">
            <FontAwesomeIcon className="cursor-pointer" onClick={refetch} icon={faRefresh} size="2x" />
          </div>
        )}
        <Link to={getLink ? getLink() : 'add'}>
          <FontAwesomeIcon icon={faCirclePlus} size="2x" />
        </Link>
      </div>
    </div>
  );
}
