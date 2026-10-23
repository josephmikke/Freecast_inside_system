import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav } from '@components/index';
import CustomLoader from '@components/commons/CustomLoader';
import IngestionInfoLines from '@components/content/ingestions/IngestionInfoLine';
import { statusBadgeColor } from '@components/content/ingestions/IngestionForm';
import Pagination from '@components/commons/Pagination';

interface IngestionFormEditProps {
  item: any;
  isFetching: boolean;
}

export default function IngestionFormEdit({ item, isFetching }: IngestionFormEditProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [indexPage, setIndexPage] = useState<number>(1);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const restartIngestion = () => {
    navigate(`/content/ingestions/add?extId=${item?.value[indexPage - 1]?.extId}`);
  };

  return (
    <Nav.Content
      title="Ingestions"
      desc="Edit Ingestion"
    >
      {isFetching && (
        <div className="top-0 left-0 w-[100vw] h-[100vh] absolute">
          <CustomLoader />
        </div>
      )}
      <div>
        <div>
          <Pagination
            pageIndex={indexPage}
            setPageIndex={setIndexPage}
            pageCount={item?.value?.length}
          />
        </div>
        <div className="flex mt-6 justify-between w-full">
          <div
            className={`mb-3 px-5 py-2 rounded-xl w-fit ${statusBadgeColor(item?.value[indexPage - 1]?.status)}`}
          >
            {item?.value[indexPage - 1]?.status}
          </div>
          <div className="flex gap-4 flex-row">
            <button
              className="flex justify-center items-center bg-gray-light rounded-xl w-48 h-10"
              type="button"
              onClick={goBack}
            >
              Cancel
            </button>
            <button
              className="bg-blue flex justify-center items-center rounded-xl w-48 h-10"
              type="button"
              onClick={restartIngestion}
            >
              Restart ingestion
            </button>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl mb-3">Ingest URL</h2>
              <IngestionInfoLines
                noResultLabel="No ingest URL."
                lines={item?.value[indexPage - 1]?.extId ? [item?.value[indexPage - 1]?.extId] : []}
              />
            </div>
            <div className="mb-6">
              <h2 className="text-2xl mb-3">Failures</h2>
              <IngestionInfoLines
                noResultLabel="No failures."
                lines={item?.value[indexPage - 1]?.failures || []}
              />
            </div>
            <div className="mb-6">
              <h2 className="text-2xl mb-3">Saved</h2>
              <IngestionInfoLines
                noResultLabel="No saveds."
                lines={item?.value[indexPage - 1]?.saved || []}
              />
            </div>
            <div className="mb-6">
              <h2 className="text-2xl mb-3">Jobs</h2>
              <IngestionInfoLines
                noResultLabel="No jobs."
                lines={Object
                  .keys(item?.value[indexPage - 1].jobs || {})
                  .map((key) => `${key} : ${item?.value[indexPage - 1]?.jobs[key]}`)}
              />
            </div>
          </div>
        </div>
      </div>
    </Nav.Content>
  );
}
