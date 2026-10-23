import React, { useState } from 'react';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Channels } from '@api/index';
import CustomTable from '@components/commons/tables/CustomTable';
import CustomLoader from '@components/commons/CustomLoader';
import usePackageChannels from '@/domain/hooks/usePackageChannels';
import usePackageVods from '@/domain/hooks/usePackageVods';
import usePackageChannelsAndVodsColumn
  from '@components/configurations/packages/form/usePackageChannelsAndVodsColumn';

interface PackageContentFieldProps {
  packageId: string;
  action: 'add' | 'edit';
}

export default function PackageContentField({
  packageId,
  action,
}: PackageContentFieldProps) {
  const {
    channels,
    isFetching: channelsIsFetching,
    refetch: channelRefetch,
  } = usePackageChannels(packageId);
  const {
    vods,
    isFetching: vodsIsFetching,
    refetch: vodRefetch,
  } = usePackageVods(packageId);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const data = [
    ...(channels?.map?.((channel: any) => ({ ...channel, type: 'Channel' })) || []),
    ...(vods?.map?.((vod: any) => ({ ...vod, type: 'VOD' })) || []),
  ];

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-row justify-between items-center">
        <div className="flex">
          <label className="mb-0">Content</label>
        </div>
        <div className="flex items-center">
          {showTooltip && (
            <span className="mr-3 bg-white text-black text-sm rounded-xl px-3 py-1">
              Add Content to this Package in the Channels or VOD sections.
            </span>
          )}
          <FontAwesomeIcon
            className="cursor-pointer"
            onClick={() => setShowTooltip((prev) => !prev)}
            icon={faQuestionCircle}
            size="2x"
          />
        </div>
      </div>
      <div className="flex mt-3 h-full rounded-xl !h-64 flex-row w-full bg-gray-dark p-3">
        {action === 'add' ? (
          <div className="p-3">
            <span>Add content to this Package in the Channels or VOD sections.</span>
          </div>
        ) : (
          <>
            {(channelsIsFetching || vodsIsFetching) && (
              <div className="flex w-full h-full justify-center items-center">
                <CustomLoader contained={false} size={40} />
              </div>
            )}
            {channels?.length === 0
              && vods?.length === 0
              && !vodsIsFetching
              && !channelsIsFetching && (
              <div className="flex w-full flex-row">
                <span>No channels.</span>
              </div>
            )}
            {channels?.length > 0 && !vodsIsFetching && !channelsIsFetching && (
              <div className="w-full overflow-y-scroll">
                <CustomTable
                  refetch={async () => {
                    await channelRefetch();
                    await vodRefetch();
                  }}
                  data={data}
                  useColumns={usePackageChannelsAndVodsColumn}
                  getEditPath={(id: string) => id}
                  deleteEntity={Channels.deleteChannel}
                  updateEntity={Channels.updateChannel}
                  entityName="Channel"
                  rowHeight={80}
                  editable={false}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
