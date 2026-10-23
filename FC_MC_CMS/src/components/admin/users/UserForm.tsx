import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import validationSchema from '@components/admin/users/validationSchema';
import FormTitle from '@components/commons/forms/FormTitle';
import { Field } from '@components/form';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import { Users } from '@/api';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import ConfirmationModalContent from '@/components/commons/forms/ConfirmationModalContent';

interface UserFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
}

export default function UserForm({
  id,
  refetch,
  data,
  action,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, loading, formConfirmationState } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: any) => {
    await withConfirmation(async () => {
      const finalData: any = {
        name: d.name,
        email: d.email,
      };

      try {
        if (action === 'edit') {
          await Users.updateUser(id!, finalData);
        } else {
          await Users.addUser(finalData);
        }
        handleSuccess(goBack, refetch, 'User', action);
      } catch (error: any) {
        handleError(action, 'User', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="User" />
      </div>
      <ConfirmationModalContent name="User" formConfirmationState={formConfirmationState}>
        <div className="flex flex-row gap-4">
          <Field inputClassName="!bg-gray-dark" label="Name" name="name" type="string" register={register} errors={errors} />
          <Field inputClassName="!bg-gray-dark" label="Email" name="email" type="string" register={register} errors={errors} />
        </div>
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
