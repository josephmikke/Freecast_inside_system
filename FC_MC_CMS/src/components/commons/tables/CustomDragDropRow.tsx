import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Cell, Row } from 'react-table';

const DND_ITEM_TYPE = 'row';

interface CustomDragDropRowProps {
  row: Row<any>;
  rowIndex: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onDropRow: ({ id, index }: { id: string, index: number }) => void;
  onClick: (row: Row<any>) => void;
  rowHeight: number;
  rowRounded: string;
}

export default function CustomDragDropRow({
  row,
  rowIndex,
  moveRow,
  onClick,
  rowHeight,
  onDropRow,
}: CustomDragDropRowProps) {
  const dropRef = useRef(null);
  const dragRef = useRef(null);

  const [, drop] = useDrop({
    accept: DND_ITEM_TYPE,
    hover(item: any, monitor: any) {
      if (!dropRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = rowIndex;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = (dropRef.current as any).getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveRow(dragIndex, hoverIndex);
      // eslint-disable-next-line no-param-reassign
      item.index = hoverIndex;
    },
    drop(item: any) {
      if (item.index !== item.weight) {
        onDropRow(item);
      }
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: DND_ITEM_TYPE,
    item: { id: row.id, index: rowIndex, weight: row.original.weight || -1 },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(drop(dropRef));
  drag(dragRef);

  const opacity = isDragging ? 'opacity-25' : 'opacity-100';

  return (
    <tr
      ref={dropRef}
      {...row.getRowProps()}
      style={{ height: `${rowHeight}px` }}
      className={`flex my-4 rounded-xl items-center cursor-pointer hover:bg-gray-light ${opacity}`}
      onClick={() => onClick(row)}
    >
      {row.cells.map((cell: Cell) => {
        if ((cell.column.Header as any)?.name === 'emptyRenderer') return null;
        return (
          <td
            ref={cell.column.Header === 'Drag' ? dragRef : null}
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
