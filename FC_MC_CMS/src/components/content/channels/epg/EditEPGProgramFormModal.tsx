import React, { useState } from 'react';
import Modal from 'react-modal';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';
import modalStyles from '@/styles/modalStyles';
import {
  Field, FieldBoolean, FieldImage, FieldJson, FieldSelect, FieldTextarea,
} from '@components/form';
import { EPGResult } from '@entities/content/epg';
import validationSchema from '@components/content/channels/epg/validationSchema';
import updateProgram from '@components/content/channels/epg/updateProgram';
import ConfirmModal from '@components/content/channels/ConfirmModal';

interface EditEPGProgramFormModalProps {
  isOpen: boolean;
  setOpen: (selectedEPGProgram: number) => void;
  epg: EPGResult | undefined;
  selectedEpgIndex: number;
  refetch: () => void;
}

const ratingValues = [
  { label: 'G', value: 'G' },
  { label: 'PG', value: 'PG' },
  { label: 'PG-13', value: 'PG-13' },
  { label: 'R', value: 'R' },
  { label: 'NC-17', value: 'NC-17' },
  { label: 'NOT_RATED', value: 'NOT_RATED' },
];

function getEpgProgramValue(epg: EPGResult | undefined, selectedEpgIndex: number) {
  if (!epg?.programs || selectedEpgIndex < 0 || !epg?.programs?.[selectedEpgIndex]) {
    return {};
  }

  return {
    ...epg?.programs?.[selectedEpgIndex],
    data: JSON.stringify(epg?.programs?.[selectedEpgIndex] ?? {}, undefined, 4),
  };
}

export default function EditEPGProgramFormModal({
  isOpen,
  setOpen,
  epg,
  selectedEpgIndex,
  refetch,
}: EditEPGProgramFormModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    values: getEpgProgramValue(epg, selectedEpgIndex),
  });
  const [openConfirmModal, setOpenConfirmModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmit = async (finalData: any) => {
    setLoading(true);
    if (epg) {
      await updateProgram(finalData, epg, selectedEpgIndex, setOpen, refetch);
    } else {
      toast.error('EPG not found. Please try again.');
    }
    setOpenConfirmModal(false);
    setLoading(false);
  };

  return (
    <Modal
      style={modalStyles}
      isOpen={isOpen}
      ariaHideApp={false}
      onRequestClose={() => setOpen(-1)}
    >
      <p>Edit EPG Program</p>
      <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-row gap-12">
          <div className="flex flex-col">
            <FieldImage
              label="Program Image"
              name="thumbnail"
              errors={errors}
              register={register}
              imageSrc={epg?.programs?.[selectedEpgIndex]?.thumbnail ?? ''}
            />
            <Field containerClassName="mt-3" inputClassName="!min-w-1 !bg-gray-dark" label="Program name" name="title" type="string" register={register} errors={errors} />
            <Field inputClassName="!min-w-1 !bg-gray-dark" label="Slug" name="slug" type="string" register={register} errors={errors} />
            <Field inputClassName="!min-w-1 !bg-gray-dark" label="ID" name="id" type="string" register={register} errors={errors} />
            <Field inputClassName="!min-w-1 !bg-gray-dark" label="Start Date" name="start_date" type="date" register={register} errors={errors} />
            <Field inputClassName="!min-w-1 !bg-gray-dark" label="End Date" name="end_date" type="date" register={register} errors={errors} />
            <Field inputClassName="!min-w-1 !bg-gray-dark" label="Total duration" name="duration" type="string" register={register} errors={errors} />
          </div>
          <div className="flex flex-col">
            <FieldImage
              label="Program Alt Image"
              name="alternateThumbnail"
              errors={errors}
              register={register}
              imageSrc={epg?.programs?.[selectedEpgIndex]?.alternateThumbnail ?? ''}
            />
            <Field containerClassName="mt-3" inputClassName="!min-w-1 !bg-gray-dark" label="Episode title" name="subtitle" type="string" register={register} errors={errors} />
            <FieldTextarea textAreaClassName="!min-w-1 !bg-gray-dark" label="Program description" name="description" register={register} errors={errors} />
            <FieldSelect
              label="Rating"
              name="rating"
              values={ratingValues}
              control={control}
              errors={errors}
            />
            <div className="flex flex-row items-center">
              <Field containerClassName="mt-3" inputClassName="!min-w-1 !bg-gray-dark" label="Start Time" name="start_time" type="string" register={register} errors={errors} />
              <p className="ml-3 mt-9">UTC</p>
            </div>
            <div className="flex flew-row items-center">
              <Field inputClassName="!min-w-1 !bg-gray-dark" label="End Time" name="end_time" type="string" register={register} errors={errors} />
              <p className="ml-3 mt-9">UTC</p>
            </div>
            <p className="italic text-gray-light text-sm">
              Hint: Enter the time in 24 Hour Format
              <br />
              (Ex: 1pm should be 13:00)
            </p>
          </div>
          <div className="flex flex-col">
            <div className="flex flex-row">
              <FieldJson
                control={control}
                containerClassName="!w-full"
                label="EPG Program Data"
                name="data"
                width={600}
                readOnly
                errors={errors}
              />
            </div>
            <div className="flex flex-row">
              <FieldBoolean label="Catch-up Active" name="catchup" control={control} errors={errors} />
              <FieldBoolean label="Archive Program" name="archive" control={control} errors={errors} />
            </div>
          </div>
        </div>
        <div className="flex flew-row justify-center gap-8">
          <button type="button" onClick={() => setOpen(-1)} className="rounded-xl w-32 bg-gray-light py-2">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit(() => setOpenConfirmModal(true))}
            className="rounded-xl bg-blue w-32 py-2"
          >
            Save
          </button>
        </div>
      </form>
      <ConfirmModal
        isOpen={openConfirmModal}
        setIsOpen={setOpenConfirmModal}
        action="edit"
        onConfirm={handleSubmit(onSubmit)}
        loading={loading}
        name="EPG Program"
      />
    </Modal>
  );
}
