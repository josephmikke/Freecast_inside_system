import React from 'react';

interface IngestionInfoLinesProps {
  lines: string[];
  noResultLabel: string;
}

function IngestionInfoLines({ lines, noResultLabel }: IngestionInfoLinesProps) {
  return (
    <div className="max-h-[200px] overflow-y-scroll">
      {lines.length === 0 && (
        <p className="italic text-sm text-gray-light">{noResultLabel}</p>
      )}
      {lines.map((line, index) => (
        <div className="bg-gray m-1 rounded-xl p-3" key={`${line}${index.toString()}`}>
          {line}
        </div>
      ))}
    </div>
  );
}

export default IngestionInfoLines;
