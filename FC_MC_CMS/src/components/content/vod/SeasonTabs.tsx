import React from 'react';
import { Season } from '@entities/content/vod';

const seasonButtonClassname = (isSelected?: boolean): string => {
  const common = 'cursor-pointer flex px-3 w-32 py-1 h-8 justify-center items-center box-border rounded-md';
  if (isSelected) {
    return `${common} bg-green border-none`;
  }
  return `${common} bg-gray-dark border-2 border-white`;
};

interface SeasonTabsProps {
  data: Season[];
  selected: Season | undefined;
  onSelect: (season: Season) => void
}

export default function SeasonTabs({
  data,
  selected,
  onSelect,
} :SeasonTabsProps) {
  return (
    <div className="flex gap-4">
      {data.map((season) => (
        <div
          onClick={() => { onSelect(season); }}
          className={seasonButtonClassname(season.seasonNumber === selected?.seasonNumber)}
        >
          Season
          {' '}
          {season.seasonNumber}
        </div>
      ))}
    </div>
  );
}
