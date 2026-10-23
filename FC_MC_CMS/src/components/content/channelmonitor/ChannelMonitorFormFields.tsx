import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import {
  Field, FieldBoolean, FieldCheckbox, FieldJson, FieldRadio,
} from '@components/form';

interface ChannelMonitorFormFieldsProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
}
export default function ChannelMonitorFormFields({
  register,
  errors,
  control,
}: ChannelMonitorFormFieldsProps) {
  return (
    <div className="flex flex-row">
      <div>
        <Field
          inputClassName="!bg-gray-dark"
          containerClassName="pr-4"
          label="Provider Name"
          name="name"
          type="string"
          register={register}
          errors={errors}
        />
        <Field
          inputClassName="!bg-gray-dark"
          containerClassName="pr-4"
          label="Provider Slug"
          name="extId"
          type="string"
          register={register}
          errors={errors}
        />
        <div className="flex flex-row">
          <FieldCheckbox
            containerClassName="!min-w-[150px]"
            label="Content Provided"
            name="type"
            values={[{ value: 'CHANNELS', label: 'Channels' }, { value: 'VOD', label: 'VOD' }]}
            control={control}
            errors={errors}
          />
          <FieldBoolean
            containerClassName="!min-w-[200px]"
            label="Subscription Required"
            name="subscription"
            control={control}
            errors={errors}
          />
        </div>
        <FieldRadio
          label="Channel Number Format"
          name="format"
          lineOptionsClassName="!w-auto"
          values={[{
            label: 'Integer (1234)',
            value: 'INTEGER',
          }, {
            label: 'Decimal (1234.56)',
            value: 'DECIMAL',
          }, {
            label: 'N/A',
            value: 'N/A',
          }]}
          control={control}
          errors={errors}
        />
      </div>
      <div>
        <FieldJson
          label="Custom Configuration"
          name="configuration"
          control={control}
          errors={errors}
        />
      </div>
    </div>
  );
}
