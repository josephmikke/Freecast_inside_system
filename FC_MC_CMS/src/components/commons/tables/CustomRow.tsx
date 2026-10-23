import React from 'react';
import { Cell, Row } from 'react-table';

interface CustomRowProps {
  row: Row<any>;
  onClick: (row: Row<any>) => void;
  rowHeight: number;
  rowRounded: string;

}

export default function CustomRow({
  row,
  onClick,
  rowHeight,
  rowRounded,
}: CustomRowProps) {
  const rounded = rowRounded || 'rounded-xl';
  return (
    <tr
      {...row.getRowProps()}
      style={{ height: `${rowHeight}px`, minWidth: '1300px' }}
      className={`flex my-1 ${rounded} items-center cursor-pointer hover:bg-gray-light`}
      onClick={() => onClick(row)}
    >
      {row.cells.map((cell: Cell) => {
        if (typeof cell.column.Header !== 'string') return null;
        return (
          <td
            {...cell.getCellProps({
              style: { flex: (cell.column as any).flex, minWidth: cell.column.minWidth },
            })}
          >
            {cell.render('Cell')}
          </td>
        );
      })}
    </tr>
  );
}
