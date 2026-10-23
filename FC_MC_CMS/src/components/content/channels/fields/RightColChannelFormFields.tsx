import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldBoolean, FieldSelect } from '@components/form';
import useSelectLocations from '@/domain/selecthooks/useSelectLocations';
import useSelectDistributors from '@/domain/selecthooks/useSelectDistributors';

interface RightColChannelFormFieldsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
}

export default function RightColChannelFormFields({
  control,
  errors,
  register,
}: RightColChannelFormFieldsProps) {
  const { locations } = useSelectLocations();
  const distributors = useSelectDistributors();

  return (
    <>
      <Field label="Id" name="id" type="string" register={register} errors={errors} />
      <Field label="VAST ID" name="vastId" type="string" register={register} errors={errors} />
      <Field label="Expiration Date" name="expirationDate" type="date" register={register} errors={errors} />
      <span className="min-w-[350px] italic text-gray-light text-sm">Leave this blank if channel does not expire.</span>
      <div className="mt-3 flex">
        <div className="mr-6">
          <FieldBoolean
            containerClassName="!min-w-[175px]"
            label="Catch-up Active"
            name="catchUpActive"
            control={control}
            errors={errors}
          />
        </div>
        <div>
          <FieldBoolean
            containerClassName="!min-w-[175px]"
            label="Visible to Users"
            name="visible"
            control={control}
            errors={errors}
          />
        </div>
      </div>
      <FieldSelect
        isLight
        isMulti
        label="Distributors"
        name="distributors"
        values={distributors}
        control={control}
        errors={errors}
      />
      <FieldSelect
        isLight
        containerClassName="mt-3"
        isMulti
        label="Locations"
        name="locations"
        values={locations}
        control={control}
        errors={errors}
      />
    </>
  );
}
