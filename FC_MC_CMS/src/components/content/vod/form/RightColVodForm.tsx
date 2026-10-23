import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldCheckbox, FieldSelect } from '@components/form';
import LoadingPlatformFields from '@components/commons/forms/LoadingPlatformsField';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectLocations from '@/domain/selecthooks/useSelectLocations';
import useSelectDistributors from '@/domain/selecthooks/useSelectDistributors';

interface RightColVodFormProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
}

export default function RightColVodForm({
  register,
  errors,
  control,
}: RightColVodFormProps) {
  const { platforms, platformsIsFetching } = useSelectPlatforms();
  const { locations } = useSelectLocations();
  const distributors = useSelectDistributors();

  return (
    <div className="flex flex-col w-1/3 ">
      <Field label="IMBd Id" name="imdbId" type="string" register={register} errors={errors} />
      <Field label="VAST ID" name="vastId" type="string" register={register} errors={errors} />
      <Field label="Expiration Date" name="expirationDate" type="date" register={register} errors={errors} />
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
        containerClassName="mt-3"
        isMulti
        isLight
        label="Locations"
        name="locations"
        values={locations}
        control={control}
        errors={errors}
      />
    </div>
  );
}
