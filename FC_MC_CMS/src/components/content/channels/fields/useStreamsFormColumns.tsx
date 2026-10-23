import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { Control, UseFormRegister } from 'react-hook-form';
import {
  Field, FieldBoolean, FieldSelect, FieldTextarea,
} from '@components/form';
import { StreamsFormatValues, StreamTypesValues } from '@entities/content/stream';
import TrashCell from '@components/commons/cells/TrashCell';

interface UseStreamsFormColumnsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
  isLight?: boolean;
  onChangeTypeInput: (e: any, row: any) => void;
  onChangeFormatInput: (e: any, row: any) => void;
  onChangeDataInput: (e: any, row: any) => void;
  onClickStream: (e: any, row: any) => void;
  onClickTrash: (e: any, row: any) => Promise<void>;
}

export default function useStreamsFormColumns({
  control,
  errors,
  register,
  isLight,
  onChangeTypeInput,
  onChangeFormatInput,
  onChangeDataInput,
  onClickStream,
  onClickTrash,
}: UseStreamsFormColumnsProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Stream Name',
      Cell: ({ row }: { row: Row<any> }) => (
        <Field
          containerClassName="!min-w-[80px] !w-full"
          inputClassName={`${!isLight ? '!bg-gray-dark' : ''}`}
          label="Stream Name"
          name={`streams[${row.index}].name`}
          errorName="name"
          type="string"
          register={register}
          errors={errors?.streams?.[row.index]}
          hideLabel
        />
      ),
      flex: 1,
      headerClassName: 'text-left',
    },
    {
      Header: 'Stream Type',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldSelect
          isLight={isLight}
          errorName="type"
          onChange={(e) => onChangeTypeInput(e.value, row.index)}
          values={StreamTypesValues}
          control={control}
          containerClassName="!min-w-[80px] !w-full"
          label="Stream Type"
          name={`streams[${row.index}].type`}
          errors={errors?.streams?.[row.index]}
          hideLabel
        />
      ),
      flex: 1,
      headerClassName: 'text-left',
    },
    {
      Header: 'Stream Format',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldSelect
          onChange={(e) => onChangeFormatInput(e.value, row.index)}
          isLight={isLight}
          errorName="format"
          values={StreamsFormatValues}
          control={control}
          containerClassName="!min-w-[80px] !w-full"
          label="Stream Format"
          name={`streams[${row.index}].format`}
          errors={errors?.streams?.[row.index]}
          hideLabel
        />
      ),
      flex: 1,
      headerClassName: 'text-left',
    },
    {
      Header: 'Stream Data',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldTextarea
          onChange={(e) => onChangeDataInput(e.target.value, row.index)}
          rows={2}
          containerClassName="!min-w-[100px] !w-full"
          textAreaClassName={`${!isLight ? '!bg-gray-dark' : ''}`}
          label="Stream Data"
          errorName="data"
          name={`streams[${row.index}].data`}
          register={register}
          errors={errors?.streams?.[row.index]}
          hideLabel
        />
      ),
      flex: 1.4,
      headerClassName: 'text-left',
    },
    {
      Header: 'Active',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldBoolean
          containerClassName="!min-w-[80px] !w-full"
          errorName="enabled"
          errors={errors?.streams?.[row.index]}
          label="Active"
          name={`streams[${row.index}].enabled`}
          control={control}
          hideLabel
        />
      ),
      flex: 0.4,
      headerClassName: 'text-left',
    },
    {
      Header: 'DAI Params',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldBoolean
          containerClassName="!min-w-[80px] !w-full"
          errorName="daiParams"
          errors={errors?.streams?.[row.index]}
          label="DAI Params"
          name={`streams[${row.index}].daiParams`}
          control={control}
          hideLabel
        />
      ),
      flex: 0.5,
      headerClassName: 'text-left',
    },
    {
      Header: 'Weight',
      Cell: ({ row }: { row: Row<any> }) => (
        <FieldTextarea
          onChange={(e) => onChangeDataInput(e.target.value, row.index)}
          rows={1}
          containerClassName="!min-w-[20px] !w-full"
          textAreaClassName={`${!isLight ? '!bg-gray-dark' : ''}`}
          label="Weight"
          errorName="weight"
          name={`streams[${row.index}].weight`}
          register={register}
          errors={errors?.streams?.[row.index]}
          hideLabel
        />
      ),
      flex: 1.4,
      headerClassName: 'text-left',
    },
    {
      Header: 'Test Stream',
      Cell: ({ row }: { row: Row<any> }) => (
        <FontAwesomeIcon
          onClick={(e) => onClickStream(e, row)}
          className="cursor-pointer"
          icon={faPlayCircle}
          size="lg"
        />
      ),
      flex: 0.5,
    },
    {
      Header: 'Trash',
      Cell: ({ row }: { row: Row<any> }) => (
        <TrashCell onClick={(e) => onClickTrash(e, row)} entityName="Stream" ignoreConfirm />
      ),
      flex: 0.4,
    },
  ], []);
}
