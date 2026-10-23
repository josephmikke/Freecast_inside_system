import React, {
  Dispatch, SetStateAction, useEffect, useMemo,
} from 'react';
import {
  Row, usePagination, useTable,
} from 'react-table';
import { toast } from 'react-toastify';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import VodFiltersBackSide from '@components/content/vod/sortersAndFilters/VodFiltersBackSide';
import VodSorters from '@components/content/vod/sortersAndFilters/VodSorters';
import CustomRow from '@components/commons/tables/CustomRow';
import useVodColumns from '@components/content/vod/useVodColumns';
import CustomTablePagination from '@components/commons/tables/CustomTablePagination';
import CustomLoader from '@components/commons/CustomLoader';

interface VodTableProps {
  data: any;
  size?: number;
  rowHeight?: number;
  pageCount?: number;
  loading?: boolean;
  filters: {
    selectedActive: OptionType | undefined;
    setSelectedActive: Dispatch<SetStateAction<OptionType | undefined>>;
    selectedCategories: OptionType[] | undefined;
    setSelectedCategories: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedPackages: OptionType[] | undefined;
    setSelectedPackages: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedPlatforms: OptionType[] | undefined;
    setSelectedPlatforms: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedProviders: OptionType[] | undefined;
    setSelectedProviders: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedGenres: OptionType[] | undefined;
    setSelectedGenres: Dispatch<SetStateAction<OptionType[] | undefined>>;
  },
  searchValue: string;
  setSearchValue: (value: string) => void;
  onPaginationChange?: (pagination: { pageIndex: number, pageSize: number }) => void;
  onSortChange?: (sortOptions: { id: string; desc: boolean }[]) => void;
  onClickRow?: (row: any) => void;
  onClickTrash?: (row: any) => Promise<void>;
  onClickEnable?: (row: any, checked: boolean) => Promise<void>;
}

export default function VodTable({
  data,
  size = 10,
  rowHeight = 85,
  pageCount = -1,
  loading = false,
  filters,
  searchValue,
  setSearchValue,
  onPaginationChange,
  onSortChange,
  onClickRow,
  onClickTrash,
  onClickEnable,
}: VodTableProps) {
  const {
    selectedActive,
    setSelectedActive,
    selectedCategories,
    setSelectedCategories,
    selectedPackages,
    setSelectedPackages,
    selectedPlatforms,
    setSelectedPlatforms,
    selectedProviders,
    setSelectedProviders,
    selectedGenres,
    setSelectedGenres,
  } = filters;

  const columns = useVodColumns({
    onClickTrash: async (e, row) => {
      if (onClickTrash) {
        try {
          await onClickTrash(row.original);
          toast.success('success');
        } catch (error) {
          toast.error('failure');
        }
      }
    },
    onClickEnable: async (checked, row) => {
      if (onClickEnable) {
        try {
          await onClickEnable(row.original, checked);
          toast.success('success');
        } catch (error) {
          toast.error('failure');
        }
      }
    },
  });

  const {
    getTableProps,
    getTableBodyProps,
    prepareRow,
    page,
    gotoPage,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: size,
      }, // Pass our hoisted table state
      manualPagination: true, // Tell the usePagination
      // hook that we'll handle our own data fetching
      // This means we'll also have to provide our own
      // pageCount.
      pageCount: pageCount || -1,
      autoResetFilters: false,
      autoResetSortBy: false,
      autoResetAll: false,
    },
    usePagination,
  );

  useEffect(() => {
    if (onPaginationChange) {
      onPaginationChange({ pageIndex, pageSize });
    }
  }, [pageIndex, pageSize]);

  useEffect(() => {
    gotoPage(0);
  }, [
    selectedActive,
    selectedCategories,
    selectedPackages,
    selectedPlatforms,
    selectedProviders,
    selectedGenres,
    searchValue,
  ]);

  useEffect(() => {
    if (pageCount !== -1 && pageIndex >= pageCount) {
      gotoPage(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const beginPage = useMemo(() => Math.floor(pageIndex / 5) * 5, [pageIndex]);
  const endPage = useMemo(() => {
    if (pageCount === -1) return beginPage + 5;
    return Math.min(beginPage + 5, pageCount);
  }, [beginPage, pageCount]);

  const onPrev = () => {
    gotoPage(Math.max(0, Math.floor(pageIndex / 5) * 5 - 5));
  };

  const onNext = () => {
    if (pageCount === -1) {
      gotoPage(Math.floor(pageIndex / 5) * 5 + 5);
    }
    gotoPage(Math.min(pageCount - 1, Math.floor(pageIndex / 5) * 5 + 5));
  };

  return (
    <div className="">
      <div className="flex flex-row w-fit">
        <div className="flex relative flex-row">
          <div className="mr-6">
            <VodFiltersBackSide
              selectedActive={selectedActive}
              setSelectedActive={setSelectedActive}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              selectedPackages={selectedPackages}
              setSelectedPackages={setSelectedPackages}
              selectedPlatforms={selectedPlatforms}
              setSelectedPlatforms={setSelectedPlatforms}
              selectedProviders={selectedProviders}
              setSelectedProviders={setSelectedProviders}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
            />
          </div>
          <VodSorters
            setSortBy={(options) => {
              if (onSortChange) {
                onSortChange(options);
              }
            }}
          />
          <div className="ml-6 w-64 rounded-xl">
            <input
              onChange={(e) => setSearchValue?.(e.target.value)}
              type="text"
              value={searchValue}
              className="w-full px-3 h-[38px] !text-white bg-gray-light rounded placeholder-white"
              placeholder="Search..."
            />
          </div>
        </div>
      </div>
      <div className="mt-6">
        { (pageCount === 0 && !loading) && (
          <div className="w-full pt-8 pb-4 text-center">No items to display</div>
        )}
        {(pageCount !== 0) && (
          <>
            <CustomTablePagination
              pageIndex={pageIndex}
              beginPage={beginPage}
              endPage={endPage}
              onPrev={onPrev}
              onNext={onNext}
              gotoPage={gotoPage}
            />
            <table {...getTableProps()}>
              <tbody {...getTableBodyProps()}>
                {page.map((row: Row<any>) => {
                  prepareRow(row);
                  return (
                    <CustomRow
                      rowHeight={rowHeight}
                      rowRounded="rounded-sm"
                      row={row}
                      onClick={() => {
                        if (onClickRow) {
                          onClickRow(row.original);
                        }
                      }}
                      {...row.getRowProps()}
                    />
                  );
                })}
              </tbody>
            </table>
          </>
        )}
        {loading ? (
          <CustomLoader />
        ) : (
          <CustomTablePagination
            pageIndex={pageIndex}
            beginPage={beginPage}
            endPage={endPage}
            onPrev={onPrev}
            onNext={onNext}
            gotoPage={gotoPage}
          />
        )}
      </div>
    </div>
  );
}
