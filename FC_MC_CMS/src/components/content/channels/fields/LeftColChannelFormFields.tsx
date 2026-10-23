import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldSelect, FieldTextarea } from '@components/form';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectBrands from '@/domain/selecthooks/useSelectBrands';
import { rating } from '@/domain/values/rating';

interface LeftColChannelFormFieldsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
}

export default function LeftColChannelFormFields({
  control,
  errors,
  register,
}: LeftColChannelFormFieldsProps) {
  const { packages } = useSelectPackages();
  const brands = useSelectBrands();

  return (
    <>
      <Field label="Name" name="name" type="string" register={register} errors={errors} />
      <Field label="LCN" name="lcn" type="string" register={register} errors={errors} />
      <FieldSelect
        isLight
        label="Rating"
        name="rating"
        values={rating}
        control={control}
        errors={errors}
      />
      <FieldTextarea containerClassName="mt-3" label="Channel Description" name="description" register={register} errors={errors} />
      <FieldSelect
        isLight
        isMulti
        label="Packages"
        name="packages"
        values={packages}
        control={control}
        errors={errors}
      />
      <FieldSelect
        isLight
        containerClassName="mt-3"
        isMulti
        label="Brands"
        name="brands"
        values={brands}
        control={control}
        errors={errors}
      />
    </>
  );
}
