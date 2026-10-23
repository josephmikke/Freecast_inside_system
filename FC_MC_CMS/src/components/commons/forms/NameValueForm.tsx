import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { AxiosResponse } from 'axios';
import { Field } from '@components/form';
import FormTitle from '@components/commons/forms/FormTitle';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import addLogger from '@/activityLogger/common/add-logger';

type NameValue = {
  name: string;
  extId: string;
};

interface NameValueFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
  validationSchema: any;
  name: string;
  valueName: string;
  addEntity: (data: any) => Promise<AxiosResponse<any>>;
  updateEntity: (id: string, data: any) => Promise<AxiosResponse<any>>;
  activityLogger: (data: any, finalData: any) => void;
}

export default function NameValueForm({
  action,
  id,
  data,
  refetch,
  validationSchema,
  name,
  valueName,
  addEntity,
  updateEntity,
  activityLogger,
}: NameValueFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameValue>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, formConfirmationState, loading } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: NameValue) => {
    await withConfirmation(async () => {
      const finalData: NameValue = {
        name: d.name,
        extId: d.extId,
      };

      try {
        if (action === 'edit') {
          await updateEntity(id!, finalData);
          activityLogger(data, finalData);
        } else {
          await addEntity(finalData);
          await addLogger(name);
        }
        handleSuccess(goBack, refetch, name, action);
      } catch (error: any) {
        handleError(action, name, error?.response?.data?.error);
      }
    });
  };

  return (
    <form
      className="flex-col"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormTitle action={action} title={name} />
      <ConfirmationModalContent name={name} formConfirmationState={formConfirmationState}>
        <div className="flex flex-row">
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label={`${name} Name`}
            name="name"
            type="string"
            register={register}
            errors={errors}
          />
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pl-4"
            label={`${name} ${valueName}`}
            name="extId"
            type="string"
            register={register}
            errors={errors}
          />
        </div>
      </ConfirmationModalContent>
      <CancelOrSubmitForm
        loading={loading}
        action={action}
      />
    </form>
  );
}
