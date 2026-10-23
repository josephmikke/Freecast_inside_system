import React, {
  Dispatch, SetStateAction, useCallback, useState,
} from 'react';
import {
  Column, Row, useFilters, useSortBy, useTable,
} from 'react-table';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import update from 'immutability-helper';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CustomDragDropRow from '@components/commons/tables/CustomDragDropRow';
import CustomRow from '@components/commons/tables/CustomRow';
import deleteLogger from '@/activityLogger/common/delete-logger';
import enableLogger from '@/activityLogger/common/enable-logger';
import { OptionType } from '@components/filtersAndSorters/Sorters';

interface CustomTableProps {
  refetch: () => void;
  data: any;
  useColumns: (args: any) => Column[];
  getEditPath?: (id: string, other: any) => string;
  deleteEntity: (id: string) => any;
  updateEntity: (id: string, { enabled }: { enabled: boolean }) => any;
  updateWeightEntity?: (id: string, weight: number) => any;
  entityName: string;
  rowHeight?: number;
  rowRounded?: string;
  isDraggable?: boolean;
  editable?: boolean;
  FiltersSortersComponent?: any;
  Sorter?: any;
  Filter?: any;
  withSearch?: boolean;
  customOnClickRow?: (id: string, other: any) => void;
  containerClassName?: string;
  searchValue?: string;
  setSearchValue?: (value: string) => void;
  filters?: {
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
  }
}

export default function CustomTable({
  data,
  useColumns,
  refetch,
  getEditPath,
  deleteEntity,
  updateWeightEntity,
  updateEntity,
  entityName,
  FiltersSortersComponent,
  withSearch = false,
  Sorter,
  Filter,
  isDraggable = false,
  rowHeight = 85,
  rowRounded = '',
  editable = true,
  customOnClickRow,
  containerClassName = '',
  searchValue,
  setSearchValue,
  filters,
}: CustomTableProps) {
  const [records, setRecords] = useState(data);
  const navigate = useNavigate();

  const handleSuccess = (action: 'deleted' | 'enabled' | 'disabled' | 'updated') => {
    toast.success(`${entityName.toLowerCase()} ${action} successfully`);
    refetch();
  };

  const handleError = (action: 'delete' | 'enable' | 'update' | 'disable', error?: string) => {
    toast.error(`[Error] Can't ${action} ${entityName.toLowerCase()} : ${JSON.stringify(error)}`);
  };

  const onClickEnable = async (checked: boolean, row: Row<any>) => {
    try {
      await updateEntity(row.original.id, { enabled: checked });
      await enableLogger(entityName.toLowerCase(), checked);
      handleSuccess(checked ? 'enabled' : 'disabled');
    } catch (error: any) {
      handleError(checked ? 'enable' : 'disable', error?.response?.data?.error);
    }
  };

  const onClickTrash = async (event: React.MouseEvent<SVGSVGElement, MouseEvent>, row: any) => {
    event.stopPropagation();
    try {
      await deleteEntity(row.original.id);
      await refetch();
      await deleteLogger(entityName.toLowerCase());
      handleSuccess('deleted');
    } catch (error: any) {
      handleError('delete', error?.response?.data?.error);
    }
  };

  const getRowId = useCallback((row: any) => row.id, []);

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const dragRecord = records[dragIndex];
    setRecords(
      update(records, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragRecord],
        ],
      }),
    );
  };

  const onDropRow = async ({ id, index }: { id: string, index: number }) => {
    if (updateWeightEntity) {
      try {
        await updateWeightEntity(id, index);
        handleSuccess('updated');
      } catch (error: any) {
        handleError('update', error?.response?.data?.error);
      }
    }
  };

  const onClickRow = (row: Row<any>) => {
    if (customOnClickRow) {
      customOnClickRow(row.original.id, row.original);
    } else if (getEditPath) {
      if (editable) {
        navigate(getEditPath(row.original.id, row.original));
      }
    }
  };

  const columns = useColumns({ onClickTrash, onClickEnable });

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    // @ts-ignore
    setSortBy,
    // @ts-ignore
    setFilter,
  } = useTable(
    {
      columns,
      data: isDraggable ? records : data,
      getRowId,
      // @ts-ignore
      autoResetFilters: false,
      // @ts-ignore
      autoResetSortBy: false,
      // @ts-ignore
      autoResetAll: false,
    },
    useFilters,
    useSortBy,
  );

  if (isDraggable) {
    return (
      <DndProvider backend={HTML5Backend}>
        <table {...getTableProps()}>
          <tbody {...getTableBodyProps()}>
            {rows.map((row: Row<any>, index: number) => {
              prepareRow(row);
              return (
                <CustomDragDropRow
                  onDropRow={onDropRow}
                  rowHeight={rowHeight}
                  rowRounded={rowRounded}
                  row={row}
                  rowIndex={index}
                  moveRow={moveRow}
                  onClick={onClickRow}
                  {...row.getRowProps()}
                />
              );
            })}
          </tbody>
        </table>
      </DndProvider>
    );
  }

  return (
    <div className={containerClassName}>
      {FiltersSortersComponent
        && Sorter && (
        <FiltersSortersComponent
          withSearch={withSearch}
          Sorter={Sorter}
          Filter={Filter}
          data={data}
          setFilter={setFilter}
          setSortBy={setSortBy}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          filters={filters}
        />
      )}
      <table {...getTableProps()}>
        <tbody {...getTableBodyProps()}>
          {rows.map((row: Row<any>) => {
            prepareRow(row);
            return (
              <CustomRow
                rowHeight={rowHeight}
                rowRounded={rowRounded}
                row={row}
                onClick={onClickRow}
                {...row.getRowProps()}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
