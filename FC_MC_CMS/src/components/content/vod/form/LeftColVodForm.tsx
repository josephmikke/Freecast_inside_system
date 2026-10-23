import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldSelect, FieldTextarea } from '@components/form';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectBrands from '@/domain/selecthooks/useSelectBrands';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';

interface LeftColVodFormProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
}

export default function LeftColVodForm({
  register,
  errors,
  control,
}: LeftColVodFormProps) {
  const { packages } = useSelectPackages();
  const brands = useSelectBrands();
  const { providers } = useSelectProviders();

  return (
    <div className="flex flex-col w-1/3 ">
      <Field label="Name" name="name" type="string" register={register} errors={errors} />
      <Field label="Slug" name="slug" type="string" register={register} errors={errors} />
      <FieldSelect
        isLight
        label="Provider"
        name="provider"
        values={providers}
        control={control}
        errors={errors}
      />
      <FieldTextarea
        containerClassName="mt-3"
        label="Description"
        name="description"
        register={register}
        errors={errors}
      />
      <FieldSelect
        isMulti
        isLight
        label="Packages"
        name="packages"
        values={packages}
        control={control}
        errors={errors}
      />
      <FieldSelect
        containerClassName="mt-3"
        isMulti
        isLight
        label="Brands"
        name="brands"
        values={brands}
        control={control}
        errors={errors}
      />
    </div>
  );
}
