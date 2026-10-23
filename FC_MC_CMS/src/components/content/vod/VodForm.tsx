import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  FieldJson,
} from '@components/form';
import validationSchema from '@components/content/vod/validationSchema';
import { VodResult } from '@entities/content/vod';
import CancelOrSubmit from '@components/content/channels/fields/CancelOrSubmit';
import ImagesFields from '@components/content/vod/form/ImagesFields';
import ConfirmModal from '@components/content/channels/ConfirmModal';
import LeftColVodForm from '@components/content/vod/form/LeftColVodForm';
import MiddleColVodForm from '@components/content/vod/form/MiddleColVodForm';
import RightColVodForm from '@components/content/vod/form/RightColVodForm';
import StreamsFormTable from '@components/content/channels/fields/StreamsFormTable';
import { makeEmptyStream } from '@/domain/entities/content/stream';
import VodSeasons from '@components/content/vod/VodSeasons';
import handleAddOrEditMovies from '@components/content/vod/handlers/handleAddOrEditMovie';
import handleAddOrEditSeries from '@components/content/vod/handlers/handleAddOrEditSerie';

interface VodFormProps {
  action: 'add' | 'edit';
  refetch: () => void;
  data?: any;
  id?: string;
}

export default function VodForm({
  action,
  refetch,
  data,
  id,
}: VodFormProps) {
  const [searchParams] = useSearchParams();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VodResult>({ resolver: yupResolver(validationSchema(action, searchParams.get('type') as 'movies' | 'shows')), values: data });
  const { fields, append, remove } = useFieldArray({ control, name: 'streams' });
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (finalData: any) => {
    const type = searchParams.get('type');

    setLoading(true);
    if (type === 'movies') {
      await handleAddOrEditMovies(
        finalData,
        id,
        action,
        refetch,
        () => {
          setConfirmModalIsOpen(false);
          goBack();
        },
        data,
      );
    } else if (type === 'shows') {
      await handleAddOrEditSeries(
        finalData,
        id,
        action,
        refetch,
        () => {
          setConfirmModalIsOpen(false);
          goBack();
        },
        data,
      );
    } else {
      toast.error('An error occurred.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex flex-col xl:flex-row xl:w-full">
        <div className="w-full xl:w-1/2">
          <ImagesFields errors={errors} data={data} register={register} />
        </div>
        <div className="w-full xl:w-1/2">
          <CancelOrSubmit
            onConfirm={handleSubmit(() => setConfirmModalIsOpen(true))}
            action={action}
            goBack={goBack}
          />
          <FieldJson
            height={150}
            isDark
            containerClassName="!w-full bg-gray-dark"
            label="Content Data"
            name="contentData"
            errors={errors}
            control={control}
          />
        </div>
      </div>
      <div className="w-full flex flex-col xl:flex-row justify-center">
        <LeftColVodForm register={register} errors={errors} control={control} />
        <MiddleColVodForm register={register} errors={errors} control={control} />
        <RightColVodForm register={register} errors={errors} control={control} />
      </div>
      {searchParams.get('type') === 'movies' && (
        <div className="w-full">
          <div className="flex w-full justify-between items-center mb-3">
            <p className="font-bold text-xl">
              Streams
              {`: ${fields?.length || 0}`}
            </p>
            <button onClick={() => append(makeEmptyStream())} type="button">
              <FontAwesomeIcon icon={faCirclePlus} size="2x" />
            </button>
          </div>
          <StreamsFormTable
            removeStream={remove}
            streams={fields}
            register={register}
            control={control}
            errors={errors}
          />
        </div>
      )}
      {searchParams.get('type') === 'shows' && (
        <div className="w-full">
          <VodSeasons refetch={refetch} episodes={data?.episodes ?? []} action={action} />
        </div>
      )}
      <ConfirmModal
        name={searchParams.get('type') === 'shows' ? 'Show' : 'Movie'}
        loading={loading}
        isOpen={confirmModalIsOpen}
        setIsOpen={setConfirmModalIsOpen}
        action={action}
        onConfirm={handleSubmit(onSubmit)}
      />
    </form>
  );
}
