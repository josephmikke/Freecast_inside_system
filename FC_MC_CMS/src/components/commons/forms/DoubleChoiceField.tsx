import React from 'react';

interface DoubleChoiceFieldProps {
  first: { label: string, value: string };
  second: { label: string, value: string };
  label?: string;
  bgColor?: string;
  onSelect: (value: string) => void;
  selected: string;
  containerClassName?: string;
}

const commonStyle = 'w-32 !h-8 flex justify-center items-center border-2 border-white rounded-sm cursor-pointer';
function selectedStyle(bgColor = 'bg-blue') { return `border-none ${bgColor}`; }

export default function DoubleChoiceField({
  label,
  first,
  second,
  bgColor,
  onSelect,
  selected,
  containerClassName = '',
}: DoubleChoiceFieldProps) {
  return (
    <div className={`mt-3 ${containerClassName}`}>
      {label && <label>{label}</label>}
      <div className="flex flex-row h-full">
        <div
          onClick={() => onSelect(first.value)}
          className={`${commonStyle} ${first.value === selected ? selectedStyle(bgColor) : ''} mr-4`}
        >
          {first.label}
        </div>
        <div
          onClick={() => onSelect(second.value)}
          className={`${commonStyle} ${second.value === selected ? selectedStyle(bgColor) : ''} `}
        >
          {second.label}
        </div>
      </div>
    </div>
  );
}
