import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

interface LogRowProps {
  text: string;
  date: moment.Moment;
}

export default function LogRow({ text, date }: LogRowProps) {
  return (
    <div className="flex flex-row m-2 w-full">
      <div className="flex justify-center p-3">
        <FontAwesomeIcon size="2x" icon={faUser} />
      </div>
      <div className="flex pl-2 flex-col">
        <p>
          {text}
        </p>
        <p className="mt-2 text-sm italic text-gray-light">
          {date.fromNow()}
        </p>
      </div>
    </div>
  );
}
