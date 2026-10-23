import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FieldImage,
} from '@components/form';
import validationSchema from '@components/content/channels/validationSchema';
import CancelOrSubmit from '@components/content/channels/fields/CancelOrSubmit';
import { ChannelResult } from '@entities/content/channel';
import StreamsFormTable from '@components/content/channels/fields/StreamsFormTable';
import EPGFormFields from '@components/content/channels/fields/EPGFormFields';
import LeftColChannelFormFields from '@components/content/channels/fields/LeftColChannelFormFields';
import MiddleColChannelFormFields
  from '@components/content/channels/fields/MiddleColChannelFormFields';
import RightColChannelFormFields
  from '@components/content/channels/fields/RightColChannelFormFields';
import StreamsOrEPGChoice from '@components/content/channels/fields/StreamsOrEPGChoice';
import createUpdateEPG from '@components/content/channels/createUpdateEPG';
import ConfirmModal from '@components/content/channels/ConfirmModal';
import createUpdateChannel from '@components/content/channels/createUpdateChannel';
import { Epg } from '@api/index';

interface ChannelFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
  onTriggered?: () => void;
}

export default function ChannelForm({
  action,
  refetch,
  data,
  id,
  onTriggered,
}: ChannelFormProps) {
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<ChannelResult>({ resolver: yupResolver(validationSchema(action)), values: data });
  const { fields, append, remove } = useFieldArray({ control, name: 'streams' });
  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [streamOrEpg, setStreamOrEpg] = useState<'streams' | 'EPG'>('streams');
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (_data: any) => {
    setLoading(true);
    const epgId = await createUpdateEPG(_data, action, data);
    const channelCreatedOrUpdated = await createUpdateChannel(
      _data,
      action,
      id,
      goBack,
      () => {},
      epgId,
      data,
    );
    if (!channelCreatedOrUpdated && action === 'add') {
      try {
        if (epgId) {
          await Epg.deleteEpg(epgId);
        }
      } catch (error: any) {
        toast.error(`Error deleting EPG : ${JSON.stringify(error?.response?.data?.error)}`);
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex flex-col xl:flex-row xl:w-full justify-between mt-6">
        <div className="w-full xl:w-1/2 m-3">
          <FieldImage name="thumbnail" errors={errors} register={register} imageSrc={data?.thumbnail} />
        </div>
        <CancelOrSubmit
          onConfirm={handleSubmit(() => setConfirmModalIsOpen(true))}
          action={action}
          goBack={goBack}
        />
      </div>
      <div className="w-full xl:w-1/3">
        <LeftColChannelFormFields control={control} errors={errors} register={register} />
      </div>
      <div className="fw-full xl:w-1/3">
        <MiddleColChannelFormFields
          getValues={getValues}
          control={control}
          errors={errors}
          register={register}
        />
      </div>
      <div className="w-full xl:w-1/3">
        <RightColChannelFormFields control={control} errors={errors} register={register} />
      </div>
      <StreamsOrEPGChoice
        epg={data?.epg}
        streamOrEpg={streamOrEpg}
        setStreamOrEpg={setStreamOrEpg}
        appendStream={append}
        streamCount={fields?.length || 0}
        onTriggered={onTriggered}
      />
      {streamOrEpg === 'streams' && (
        <StreamsFormTable
          removeStream={remove}
          streams={fields}
          register={register}
          control={control}
          errors={errors}
        />
      )}
      {streamOrEpg === 'EPG' && (
        <EPGFormFields
          refetch={refetch}
          data={data}
          control={control}
          register={register}
          errors={errors}
        />
      )}
      <ConfirmModal
        name="Channel"
        loading={loading}
        isOpen={confirmModalIsOpen}
        setIsOpen={setConfirmModalIsOpen}
        action={action}
        onConfirm={handleSubmit(onSubmit)}
      />
    </form>
  );
}
