import React, { useState } from 'react';
import moment from 'moment';

interface VodDateCellProps {
  firstLabelDate: string;
  secondLabelDate: string;
  firstDate: string;
  secondDate: string;
  thirdDate: string;
  showHover?: boolean;
}

export default function VodDateCell({
  firstLabelDate,
  secondLabelDate,
  firstDate,
  secondDate,
  thirdDate,
  showHover = true,
}: VodDateCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getFormattedDateOrInfinity = (date: string | undefined) => (date ? moment(date).format('MM/DD/YYYY') : 'N/A');

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
          {firstDate ? `${moment(firstDate).format('MM/DD/YYYY')} - ${getFormattedDateOrInfinity(thirdDate)}` : '-/-'}
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
        <div className="absolute top-12 px-3 py-1 rounded-xl bg-gray-dark text-white">
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
