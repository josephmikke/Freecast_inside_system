import React, { ReactNode } from 'react';
import CustomLoader from '@components/commons/CustomLoader';

interface LoadingPlatformFieldsProps {
  platforms: any[];
  platformsIsFetching: boolean;
  children: ReactNode;
}

export default function LoadingPlatformFields({
  platforms,
  children,
  platformsIsFetching,
}: LoadingPlatformFieldsProps) {
  return (
    <>
      {platformsIsFetching && (
      <div className="flex flex-col">
        <label>Available Platforms</label>
        <div className="w-full flex justify-center">
          <CustomLoader contained={false} size={30} />
        </div>
      </div>
      )}
      {platforms?.length === 0 && !platformsIsFetching && (
      <div className="flex min-w-[350px] flex-col">
        <label>Available Platforms</label>
        <span className="py-4">No platforms</span>
      </div>
      )}
      {platforms?.length > 0 && !platformsIsFetching && (
        children
      )}
    </>
  );
}
