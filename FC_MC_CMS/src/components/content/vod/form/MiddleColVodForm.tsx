import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldSelect } from '@components/form';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import useSelectGenres from '@/domain/selecthooks/useSelectGenres';
import { rating } from '@/domain/values/rating';
import FieldSelectCategories from '@pages/content/common/fields/FieldSelectCategories';
import CategoriesWeightList from '@pages/content/common/fields/CategoriesWeightList';

interface MiddleColVodFormProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
}

export default function MiddleColVodForm({
  register,
  errors,
  control,
}: MiddleColVodFormProps) {
  const { categories } = useSelectCategories();
  const { genres } = useSelectGenres();

  return (
    <div className="flex flex-col w-1/3">
      <Field label="Id" name="id" type="string" register={register} errors={errors} />
      <Field label="TMDb ID" name="tmdbId" type="string" register={register} errors={errors} />
      <Field label="Available Date" name="availableDate" type="date" register={register} errors={errors} />
      <Field label="Release Year" name="releaseYear" type="string" placeholder="2023" register={register} errors={errors} />
      <FieldSelect
        isLight
        label="Rating"
        name="rating"
        values={rating}
        control={control}
        errors={errors}
      />
      <FieldSelectCategories
        isLight
        containerClassName="mt-3"
        label="Categories"
        name="categories"
        values={categories.map((category) => ({ ...category, weight: 0 }))}
        modalContent={(
          <CategoriesWeightList
            control={control}
          />
        )}
        control={control}
        errors={errors}
      />
      <FieldSelect
        containerClassName="mt-3"
        isLight
        isMulti
        label="Genres"
        name="genres"
        values={genres}
        control={control}
        errors={errors}
      />
    </div>
  );
}
