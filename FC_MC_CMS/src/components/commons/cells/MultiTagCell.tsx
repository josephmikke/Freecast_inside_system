import React, { useState } from 'react';
import TagCell from '@components/commons/cells/TagCell';

interface MultiTagCellProps {
  tags: any[];
  colored?: boolean;
  rounded?: string;
}

export default function MultiTagCell({ colored, tags, rounded }: MultiTagCellProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const handleMouseEnter = (tag: string) => {
    setHoveredTag(tag);
  };

  const handleMouseLeave = () => {
    setHoveredTag(null);
  };

  return (
    <div className="relative flex flex-wrap">
      {tags.map((tag: string) => (
        <div
          key={tag}
          onMouseEnter={() => handleMouseEnter(tag)}
          onMouseLeave={handleMouseLeave}
          className="flex relative flex-col"
        >
          <TagCell colored={colored} value={tag} rounded={rounded} />
          {hoveredTag === tag && (
            <div className="absolute top-12 left-2 px-3 py-1 rounded-xl bg-gray-dark text-white z-10">
              <p className="truncate">
                {tag}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
