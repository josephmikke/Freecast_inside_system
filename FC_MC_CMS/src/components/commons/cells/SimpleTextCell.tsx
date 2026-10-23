import React from 'react';

export default function SimpleTextCell({ text }: { text: string }) {
  return (
    <div>
      <p>{text}</p>
    </div>
  );
}
