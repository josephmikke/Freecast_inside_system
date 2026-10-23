import React from 'react';

interface MultiLineCellProps {
  lines: { label: string, value: string }[];
  size?: string;
}

export default function MultiLineCell({ lines, size = '14px' }: MultiLineCellProps) {
  return (
    <div
      className="relative"
    >
      { lines.map((line) => (
        <div className="flex flex-row" key={line.value}>
          <div>
            <p>
              <strong style={{ fontSize: size }}>{line.label}</strong>
              :
              {' '}
              <span style={{ fontSize: size, fontFamily: 'monospace' }}>{line.value}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
