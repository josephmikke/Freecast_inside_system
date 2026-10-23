import React from 'react';
import { Control, UseFormGetValues, UseFormRegister } from 'react-hook-form';
import { Field, FieldCheckbox, FieldSelect } from '@components/form';
import LoadingPlatformFields from '@components/commons/forms/LoadingPlatformsField';
import FieldSelectCategories from '@pages/content/common/fields/FieldSelectCategories';
import CategoriesWeightList from '@pages/content/common/fields/CategoriesWeightList';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import useSelectGenres from '@/domain/selecthooks/useSelectGenres';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import { ChannelResult } from '@entities/content/channel';

interface MiddleColChannelFormFieldsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
  getValues: UseFormGetValues<ChannelResult>;
}

export default function MiddleColChannelFormFields({
  control,
  errors,
  register,
  getValues,
}: MiddleColChannelFormFieldsProps) {
  const { platforms, platformsIsFetching } = useSelectPlatforms();
  const { providers } = useSelectProviders();
  const { categories } = useSelectCategories();
  const { genres } = useSelectGenres();

  return (
    <>
      <Field label="Slug" name="slug" type="string" register={register} errors={errors} />
      <FieldSelect
        isLight
        label="Provider"
        name="provider"
        values={providers}
        control={control}
        errors={errors}
      />
      <Field containerClassName="mt-3" label="Available Date" name="availableDate" type="date" register={register} errors={errors} />
      <Field label="Media Package Id" name="mediapackageId" type="string" register={register} errors={errors} />
      <LoadingPlatformFields platformsIsFetching={platformsIsFetching} platforms={platforms}>
        <div className="form_field_group">
          <FieldCheckbox
            containerClassName="!w-[100%]"
            lineOptionsClassName="!w-1/3 !min-w-[100px]"
            label="Available Platforms"
            name="platforms"
            values={platforms}
            control={control}
            errors={errors}
          />
        </div>
      </LoadingPlatformFields>
      <FieldSelectCategories
        containerClassName="mt-3"
        isLight
        label="Categories"
        name="categories"
        values={categories.map((category) => ({ ...category, weight: getValues('lcn') }))}
        getValues={getValues}
        modalContent={(
          <CategoriesWeightList
            control={control}
          />
        )}
        control={control}
        errors={errors}
      />
      <FieldSelect
        isLight
        isMulti
        label="Genres"
        name="genres"
        values={genres}
        control={control}
        errors={errors}
      />
    </>
  );
}
