import React, { ChangeEvent } from 'react';
import RightChevron from '@assets/icons/right-chevron.png';

interface PaginationProps {
  pageIndex: number;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
  pageCount: number;
}

function Pagination({ pageIndex, pageCount, setPageIndex }: PaginationProps) {
  const onChangePageIndex = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const value = Number(e.target.value);

      if (!Number.isNaN(value) && value >= 1 && value <= pageCount) {
        setPageIndex(value);
      }
    } else if (e.target.value === '') {
      setPageIndex(1);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${pageIndex === 1 ? 'opacity-50' : 'cursor-pointer'}`}
        onClick={() => setPageIndex((index: number) => (index === 1 ? 1 : index - 1))}
      >
        <img src={RightChevron} alt="right-chevron" className="w-3 rotate-180" />
      </div>
      <div>
        <input
          value={pageIndex}
          onChange={onChangePageIndex}
          className="w-6 h-6 rounded bg-gray-light text-center"
        />
      </div>
      <div>
        /
      </div>
      <div>
        {pageCount}
      </div>
      <div
        className={`${pageIndex === pageCount ? 'opacity-50' : 'cursor-pointer'}`}
        onClick={() => setPageIndex(
          (index: number) => (index === pageCount ? pageCount : index + 1),
        )}
      >
        <img src={RightChevron} alt="right-chevron" className="w-3" />
      </div>
    </div>
  );
}

export default Pagination;
