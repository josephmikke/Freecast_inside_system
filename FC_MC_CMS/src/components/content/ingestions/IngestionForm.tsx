import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import validationSchema from '@components/content/ingestions/validationSchema';
import ConfirmModal from '@components/content/channels/ConfirmModal';
import {
  Field, FieldBoolean,
  FieldJson, FieldSelect,
} from '@components/form';
import { IngestionResult } from '@entities/content/ingestion';
import { ingest } from '@api/ingestions';
import prefillMappingJSON from '@pages/content/ingestions/prefill-mapping.json';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectDistributors from '@/domain/selecthooks/useSelectDistributors';
import useSelectLocations from '@/domain/selecthooks/useSelectLocations';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectBrands from '@/domain/selecthooks/useSelectBrands';

export function statusBadgeColor(status: string) {
  if (status === 'IN_PROGRESS') return 'bg-orange';
  if (status === 'COMPLETED') return 'bg-green';
  if (status === 'FAILED') return 'bg-red';
  return 'bg-orange';
}

export default function IngestionForm() {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<IngestionResult>({
    resolver: yupResolver(validationSchema()),
    // @ts-ignore
    values: { mapping: prefillMappingJSON },
  });
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const { providers } = useSelectProviders();
  const { packages } = useSelectPackages();
  const distributors = useSelectDistributors();
  const { locations } = useSelectLocations();
  const { platforms } = useSelectPlatforms();
  const brands = useSelectBrands();

  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  useEffect(() => {
    const extId = searchParams.get('extId');
    if (extId) {
      setValue('url', extId);
    }
  }, []);

  const onSubmit = async (_data: any) => {
    setLoading(true);
    try {
      const dataToSend = {
        ..._data,
        provider: _data.provider?.value,
        packages: _data.packages?.map((p: any) => p.value) || [],
        distributors: _data.distributors?.map((d: any) => d.value) || [],
        locations: _data.locations?.map((l: any) => l.value) || [],
        platforms: _data.platforms?.map((p: any) => p.value) || [],
        brands: _data.brands?.map((b: any) => b.value) || [],
      };
      await ingest(dataToSend);
    } catch (error: any) {
      toast.error(`Error ingesting : ${JSON.stringify(error?.response?.data?.error)}`);
    }
    setLoading(false);
    setConfirmModalIsOpen(false);
    navigate('/content/ingestions');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex mt-6 justify-between w-full">
        <div className="flex gap-4 flex-row">
          <button
            className="flex justify-center items-center bg-gray-light rounded-xl w-48 h-10"
            type="button"
            onClick={goBack}
          >
            Cancel
          </button>
          <button
            className="bg-green flex justify-center items-center rounded-xl w-48 h-10"
            type="submit"
            onClick={handleSubmit(() => setConfirmModalIsOpen(true))}
          >
            Add
          </button>
        </div>
      </div>
      <div className="flex flex-col w-full">
        <Field
          containerClassName="!w-full mb-4"
          type="string"
          label="Ingest URL"
          name="url"
          register={register}
          errors={errors}
        />
        <FieldJson
          isDark
          containerClassName="!w-full"
          label="Ingest mapping"
          name="mapping"
          errors={errors}
          control={control}
          zIndex=" "
        />
        <div className="flex flex-row w-full gap-8">
          <FieldBoolean
            label="Private"
            name="isPrivate"
            control={control}
            errors={errors}
          />

        </div>
        <div className="flex mt-4 flex-row w-full gap-8">
          <FieldSelect
            isLight
            label="Provider"
            name="provider"
            values={providers}
            control={control}
            errors={errors}
          />
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
            label="Distributors"
            isMulti
            name="distributors"
            values={distributors}
            control={control}
            errors={errors}
          />
        </div>
        <div className="flex mt-4 flex-row w-full gap-8">
          <FieldSelect
            isLight
            label="Platforms"
            isMulti
            name="platforms"
            values={platforms}
            control={control}
            errors={errors}
          />
          <FieldSelect
            isLight
            label="Locations"
            name="locations"
            values={locations}
            control={control}
            isMulti
            errors={errors}
          />
          <FieldSelect
            isLight
            label="Brands"
            isMulti
            name="brands"
            values={brands}
            control={control}
            errors={errors}
          />
        </div>
      </div>
      <ConfirmModal
        name="Ingestion"
        loading={loading}
        isOpen={confirmModalIsOpen}
        setIsOpen={setConfirmModalIsOpen}
        action="add"
        onConfirm={handleSubmit(onSubmit)}
      />
    </form>
  );
}
