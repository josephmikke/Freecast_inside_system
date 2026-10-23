import React, { useEffect, useState } from 'react';
import { Control, UseFieldArrayRemove, UseFormRegister } from 'react-hook-form';
import { useTable } from 'react-table';
import useStreamsFormColumns from '@components/content/channels/fields/useStreamsFormColumns';
import VideoModal from '@components/video/VideoModal';
import { StreamFormat } from '@entities/content/stream';

interface StreamsFormTableProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
  streams: any;
  removeStream: UseFieldArrayRemove;
  isLight?: boolean;
}

export default function StreamsFormTable({
  control,
  errors,
  register,
  streams,
  removeStream,
  isLight = true,
}: StreamsFormTableProps) {
  const [videoOpen, setVideoOpen] = useState<number>(-1);
  const [dataInput, setDataInput] = useState<string[]>(streams?.map(
    (stream: any) => stream.data,
  ) || []);
  const [formatInput, setFormatInput] = useState<string[]>(streams?.map(
    (stream: any) => stream.format?.value,
  ) || []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [typeInput, setTypeInput] = useState<string[]>(streams?.map(
    (stream: any) => stream.type?.value,
  ) || []);

  useEffect(() => {
    if (streams) {
      setDataInput(streams.map((stream: any) => stream.data));
      setFormatInput(streams.map((stream: any) => stream.format?.value));
      setTypeInput(streams.map((stream: any) => stream.type?.value));
    }
  }, [streams]);

  const onChangeDataInput = (value: string, index: number) => {
    setDataInput((prev: string[]) => [...prev.slice(0, index), value, ...prev.slice(index + 1)]);
  };

  const onChangeFormatInput = (value: string, index: number) => {
    setFormatInput((prev: string[]) => [
      ...prev.slice(0, index), value, ...prev.slice(index + 1),
    ]);
  };

  const onChangeTypeInput = (value: string, index: number) => {
    setTypeInput((prev: string[]) => [
      ...prev.slice(0, index), value, ...prev.slice(index + 1),
    ]);
  };

  const columns = useStreamsFormColumns({
    control,
    errors,
    register,
    isLight,
    onChangeTypeInput,
    onChangeFormatInput,
    onChangeDataInput,
    onClickStream: (e, row) => setVideoOpen(row.index),
    onClickTrash: async (e, row) => {
      removeStream(row.index);
    },
  });

  const {
    headers,
    getTableProps,
    getTableBodyProps,
    prepareRow,
    rows,
  } = useTable({
    columns,
    data: streams,
  });

  return (
    <div className="w-full overflow-auto" style={{ scrollbarColor: isLight ? '' : 'darkgray white' }}>
      <div className="text-red form_field_error">{errors?.streams?.message}</div>
      <table {...getTableProps()} className="border-spacing-0 border-collapse min-w-[1000px]">
        <thead>
          <tr className="flex pl-2 text-white w-full bg-transparent">
            {headers.map((column) => (
              <th
                {...column.getHeaderProps({
                  style: { flex: (column as any).flex },
                  className: `${(column as any).headerClassName}`,
                })}
              >
                {column.render('Header')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              /* eslint-disable react/prop-types */
              <tr {...row.getRowProps()} className={`flex mb-2 pl-2 rounded-sm text-white border-2 bg-transparent ${isLight ? 'border-gray' : ''}`}>
                {row.cells.map((cell) => (
                  <td
                    {...cell.getCellProps({
                      style: { flex: (cell.column as any).flex },
                    })}
                    className="align-text-top text-left flex justify-center"
                  >
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <VideoModal
        format={formatInput[videoOpen] as StreamFormat}
        url={dataInput[videoOpen]}
        index={videoOpen}
        onClose={() => setVideoOpen(-1)}
      />
    </div>
  );
}
