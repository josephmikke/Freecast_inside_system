import React, { useState } from 'react';
import moment from 'moment';

interface DoubleDateCellProps {
  firstLabelDate: string;
  secondLabelDate: string;
  firstDate: string;
  secondDate: string;
  showHover?: boolean;
}

export default function DoubleDateCell({
  firstLabelDate,
  secondLabelDate,
  firstDate,
  secondDate,
  showHover = true,
}: DoubleDateCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex relative flex-col"
    >
      <div className="w-64 overflow-hidden">
        <p className="text-sm truncate">
          {firstLabelDate}
          :
          {' '}
          {firstDate ? moment(firstDate).format('MM/DD/YYYY hh:mm:ss') : '-/-'}
        </p>
      </div>
      <div className="w-64 overflow-hidden">
        <p className="text-sm truncate">
          {secondLabelDate}
          :
          {' '}
          {secondDate ? moment(secondDate).format('MM/DD/YYYY hh:mm:ss') : '-/-'}
        </p>
      </div>
      {isHovered && showHover && (
        <div className="absolute top-12 px-3 py-1 rounded-xl bg-gray-dark text-white z-10">
          <p className="truncate">
            {firstLabelDate}
            :
            {' '}
            {moment(firstDate).format('MM/DD/YYYY hh:mm:ss')}
          </p>
          <p className="truncate">
            {secondLabelDate}
            :
            {' '}
            {moment(secondDate).format('MM/DD/YYYY hh:mm:ss')}
          </p>
        </div>
      )}
    </div>
  );
}
