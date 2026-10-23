import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import {
  Field, FieldBoolean, FieldCheckbox, FieldImage, FieldRadio, FieldTextarea,
} from '@components/form';
import LoadingPlatformFields from '@components/commons/forms/LoadingPlatformsField';
import PackageContentField from '@components/configurations/packages/form/PackageContentField';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';

interface PackageFormFieldsProps {
  data: any;
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: any;
  action: 'add' | 'edit';
}

export default function PackageFormFields({
  data,
  register,
  control,
  errors,
  action,
}: PackageFormFieldsProps) {
  const { platforms, platformsIsFetching } = useSelectPlatforms();

  return (
    <>
      <div className="flex flex-row">
        <FieldImage
          imageSrc={data?.thumbnail}
          name="thumbnail"
          register={register}
          errors={errors}
        />
      </div>
      <div className="flex flex-row">
        <div className="flex flex-col">
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Package Name"
            name="name"
            type="string"
            register={register}
            errors={errors}
          />
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Package Slug"
            name="extId"
            type="string"
            register={register}
            errors={errors}
          />
          <FieldTextarea
            textAreaClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Package Description"
            name="description"
            register={register}
            errors={errors}
          />
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Package Price"
            name="price"
            type="float"
            register={register}
            errors={errors}
          />
        </div>
        <div className="flex flex-col ml-6">
          <div className="flex flex-row w-[800px]">
            <FieldRadio
              containerClassName="!w-1/3 !min-w-[100px]"
              label="Revenue Model"
              name="revenueModel"
              values={[{ label: 'Free', value: 'FREE' }, { label: 'Paid', value: 'PAID' }]}
              control={control}
              errors={errors}
            />
            <FieldRadio
              containerClassName="!w-1/3 !min-w-[100px]"
              lineOptionsClassName="!w-[100px]"
              label="Package Type"
              name="type"
              values={[{ value: 'INTERNAL', label: 'Internal' }, { label: 'External (3rd Party)', value: 'EXTERNAL' }]}
              control={control}
              errors={errors}
            />
            <FieldBoolean
              containerClassName="!w-1/3 !min-w-[100px]"
              label="Default Package"
              name="default"
              control={control}
              errors={errors}
            />
          </div>
          <div className="flex flex-row">
            <LoadingPlatformFields platformsIsFetching={platformsIsFetching} platforms={platforms}>
              <FieldCheckbox
                containerClassName="!w-[100%]"
                lineOptionsClassName="!w-1/3 !min-w-[100px]"
                label="Available Platforms"
                name="platforms"
                values={platforms}
                control={control}
                errors={errors}
              />
            </LoadingPlatformFields>
          </div>
          <div className="flex flex-row">
            <PackageContentField
              action={action}
              packageId={data?.id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
