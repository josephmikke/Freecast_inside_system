import React from 'react';

interface ContentProps {
  title: string;
  desc?: string;
  children?: React.ReactNode;
}

export default function Content({ title, desc, children }: ContentProps) {
  return (
    <div id="content">
      {title && <h2 className="content_title">{title}</h2>}
      {desc && <p className="content_desc">{desc}</p>}
      <div className="content_data">
        {children || 'Work in progress...'}
      </div>
    </div>
  );
}
