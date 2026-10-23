import { ClipLoader } from 'react-spinners';
import React from 'react';

interface CustomLoaderProps {
  size?: number;
  contained?: boolean;
}

export default function CustomLoader({ contained = true, size = 150 }: CustomLoaderProps) {
  if (contained) {
    return (
      <div className="h-64 flex justify-center items-center">
        <ClipLoader size={size} color="white" />
      </div>
    );
  }

  return <ClipLoader size={size} color="white" />;
}
