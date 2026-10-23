import React from 'react';

interface TagCellProps {
  value: string;
  display?: boolean;
  colored?: boolean;
  className?: string;
  color?: string;
  width?: string;
  rounded?: string;
}

export default function TagCell({
  value,
  display = true,
  colored = false,
  className = '',
  color = '',
  width = '',
  rounded = '',
}: TagCellProps) {
  if (!display) {
    return null;
  }
  const roundedClass = rounded || 'rounded-xl';

  return (
    <div
      className={`!overflow-hidden m-2 w-32 px-3 flex items-center justify-center h-8 ${roundedClass} bg-blue-gray-600 text-center ${
        colored ? '!bg-blue' : ''
      } ${className} ${color} ${width}`}
    >
      <p className="!truncate">{value}</p>
    </div>
  );
}
