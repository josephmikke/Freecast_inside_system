import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import validationSchema from '@components/admin/users/validationSchema';
import FormTitle from '@components/commons/forms/FormTitle';
import { Field, FieldSelect } from '@components/form';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import { PermissionGroups } from '@/api';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import ConfirmationModalContent from '@/components/commons/forms/ConfirmationModalContent';

const fakePermissions = [
  { value: 'permission1', label: 'Permission 1' },
  { value: 'permission2', label: 'Permission 2' },
  { value: 'permission3', label: 'Permission 3' },
  { value: 'permission4', label: 'Permission 4' },
  { value: 'permission5', label: 'Permission 5' },
];

interface PermissionGroupProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
}

export default function PermissionGroupForm({
  id,
  refetch,
  data,
  action,
}: PermissionGroupProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<any>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, loading, formConfirmationState } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: any) => {
    await withConfirmation(async () => {
      const finalData: any = {
        name: d.name,
        permissions: d.permissions.map((p: any) => p.value),
      };

      try {
        if (action === 'edit') {
          await PermissionGroups.updatePermissionGroup(id!, finalData);
        } else {
          await PermissionGroups.addPermissionGroup(finalData);
        }
        handleSuccess(goBack, refetch, 'PermissionGroup', action);
      } catch (error: any) {
        handleError(action, 'PermissionGroup', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="PermissionGroup" />
      </div>
      <ConfirmationModalContent name="PermissionGroup" formConfirmationState={formConfirmationState}>
        <div className="flex flex-row gap-4">
          <Field inputClassName="!bg-gray-dark" label="Name" name="name" type="string" register={register} errors={errors} />
          <FieldSelect
            isMulti
            label="Permissions"
            name="permissions"
            values={fakePermissions}
            control={control}
            errors={errors}
          />
        </div>
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
