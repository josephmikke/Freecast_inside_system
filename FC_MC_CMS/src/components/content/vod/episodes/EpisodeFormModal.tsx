import React, { useState } from 'react';
import Modal from 'react-modal';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import modalStyles from '@/styles/modalStyles';
import {
  Field, FieldImage, FieldJson, FieldSelect, FieldTextarea,
} from '@components/form';
import validationSchema from '@components/content/vod/episodes/validationSchema';
import { rating } from '@/domain/values/rating';
import StreamsFormTable from '@components/content/channels/fields/StreamsFormTable';
import { makeEmptyStream } from '@/domain/entities/content/stream';
import handleEditEpisode from '@components/content/vod/handlers/handleEditEpisode';
import ConfirmModal from '@components/content/channels/ConfirmModal';

interface EpisodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'add' | 'edit';
  episode: any;
  refetch: () => void;
}

export default function EpisodeFormModal({
  episode,
  isOpen,
  action,
  onClose,
  refetch,
}: EpisodeFormModalProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(validationSchema(action)), values: episode });
  const { fields, append, remove } = useFieldArray({ control, name: 'streams' });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmit = async (finalData: any) => {
    setLoading(true);
    await handleEditEpisode(finalData, episode?.id, onClose, refetch, episode);
    setLoading(false);
    setIsConfirmModalOpen(false);
  };

  return (
    <>
      <Modal
        style={{
          ...modalStyles,
          content: {
            ...modalStyles.content,
            overflowY: 'scroll',
            maxWidth: '80%',
            height: '95%',
          },
        }}
        ariaHideApp={false}
        isOpen={isOpen}
        onRequestClose={onClose}
      >
        <div className="flex flex-row w-full">
          Edit Episode
        </div>
        <form id="episode-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-row w-full">
            <FieldImage
              label="Episode Image"
              name="thumbnail"
              errors={errors}
              register={register}
              imageSrc={episode?.thumbnail}
              idPrefix={`episode-${episode?.id || 'new'}`}
            />
            <FieldImage
              containerClassName="ml-3"
              label="Episode Alt Image"
              name="alternateThumbnail"
              errors={errors}
              register={register}
              imageSrc={episode?.alternateThumbnail}
              idPrefix={`episode-${episode?.id || 'new'}`}
            />
          </div>
          <div className="flex flex-col w-full">
            <div className="flex flew-row w-full">
              <div className="flex flex-col w-1/3">
                <Field inputClassName="!bg-gray-dark" label="Episode Name" name="name" type="string" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="Slug" name="slug" type="string" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="Available Date" name="availableDate" type="date" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="Original Air Date" name="originalAirDate" type="date" register={register} errors={errors} />
              </div>

              <div className="flex flex-col w-1/3 items-center">
                <Field inputClassName="!bg-gray-dark" label="Season" name="season" type="number" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="ID" name="id" type="string" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="ExpirationDate" name="expirationDate" type="date" register={register} errors={errors} />
                <FieldSelect
                  containerClassName="z-30"
                  label="Rating"
                  name="rating"
                  values={rating}
                  control={control}
                  errors={errors}
                />
              </div>
              <div className="flex flex-col w-1/3 items-end">
                <Field inputClassName="!bg-gray-dark" label="Episode Number" name="number" type="number" register={register} errors={errors} />
                <Field inputClassName="!bg-gray-dark" label="Total Duration" name="duration" type="string" register={register} errors={errors} />
                <FieldTextarea rows={5} textAreaClassName="!bg-gray-dark" label="Episode Description" name="description" register={register} errors={errors} />
              </div>
            </div>
            <div className="flex flex-row w-full mt-3">
              <FieldJson
                height={150}
                containerClassName="!z-0 !overflow-y-scroll !w-full"
                label="Episode Data"
                name="contentData"
                control={control}
                errors={errors}
              />
            </div>
          </div>
          <div className="w-full flex flex-col">
            <div className="flex flex-row w-full h-fit justify-between ">
              <span>
                Streams
                {`: ${fields?.length || 0}`}
              </span>
              <FontAwesomeIcon onClick={() => append(makeEmptyStream())} icon={faCirclePlus} />
            </div>
            <div>
              <StreamsFormTable
                isLight={false}
                removeStream={remove}
                streams={fields}
                register={register}
                control={control}
                errors={errors}
              />
            </div>
          </div>
          <div className="flex flex-row w-full justify-center items-center gap-8">
            <button type="button" onClick={onClose} className="bg-gray-light py-2 w-24 rounded-xl">Cancel</button>
            <button type="button" onClick={() => setIsConfirmModalOpen(true)} className="bg-blue py-2 w-24 rounded-xl">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        action="edit"
        onConfirm={handleSubmit(onSubmit)}
        isOpen={isConfirmModalOpen}
        name="Episode"
        setIsOpen={setIsConfirmModalOpen}
        loading={loading}
      />
    </>
  );
}
