import React from 'react';
import { Control, Controller, UseFormRegister } from 'react-hook-form';
import { Field } from '@components/form';

interface CommonLocationDetailsProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
  name: string;
}

export default function CommonLocationDetails({
  name,
  register,
  control,
  errors,
}: CommonLocationDetailsProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            value: locationType,
          },
        }: any,
      ) => (
        <div className="flex flex-col">
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label={locationType === 'ZIPCODE' ? 'Zip Code' : 'Name'}
            name="name"
            type="string"
            register={register}
            errors={errors}
          />
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Slug"
            name="slug"
            type="string"
            register={register}
            errors={errors}
          />
          {locationType !== 'ZIPCODE' && (
            <Field
              inputClassName="!bg-gray-dark"
              containerClassName="pr-4"
              label="ID"
              name="id"
              type="string"
              register={register}
              errors={errors}
            />
          )}
        </div>
      )}
    />
  );
}
