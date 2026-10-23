import React from 'react';

interface CustomTablePaginationProps {
  pageIndex: number;
  beginPage: number;
  endPage: number;
  onPrev: () => void;
  onNext: () => void;
  gotoPage: (page: number) => void;
}

export default function CustomTablePagination({
  pageIndex,
  beginPage,
  endPage,
  onPrev,
  onNext,
  gotoPage,
}: CustomTablePaginationProps) {
  return (
    <div className="flex justify-end items-center gap-3">
      <div
        onClick={() => onPrev()}
        className="flex justify-center items-center rounded-sm w-24 h-10 cursor-pointer hover:bg-gray-light"
      >
        Previous
      </div>
      {Array.from({ length: endPage - beginPage }, (_, i) => i + beginPage).map((p) => (
        <div
          onClick={() => gotoPage(p)}
          className={`flex justify-center items-center rounded-sm w-10 h-10 cursor-pointer hover:bg-gray-light ${
            p === pageIndex ? 'bg-gray font-bold' : ''
          }`}
        >
          {p + 1}
        </div>
      ))}
      <div
        onClick={() => onNext()}
        className="flex justify-center items-center rounded-sm w-24 h-10 cursor-pointer hover:bg-gray-light"
      >
        Next
      </div>
    </div>
  );
}
