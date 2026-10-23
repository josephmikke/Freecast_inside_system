import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Packages } from '@api/index';
import FormTitle from '@components/commons/forms/FormTitle';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import fileToBase64 from '@utils/fileToBase64';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import validationSchema from '@components/configurations/packages/validationSchema';
import PackageFormFields from '@components/configurations/packages/PackageFormFields';
import { PackagePayload } from '@entities/configurations/package';
import packagesActivityLogger from '@/activityLogger/configurations/packages';
import addLogger from '@/activityLogger/common/add-logger';

interface PackageFormProps {
  action: 'add' | 'edit';
  id: string;
  data: any;
  refetch: () => void;
}

export default function PackageForm({
  action,
  id,
  data,
  refetch,
}: PackageFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PackagePayload>({ resolver: yupResolver(validationSchema(action)), values: data });
  const { withConfirmation, formConfirmationState, loading } = useFormConfirmation(action);

  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (_data: PackagePayload) => {
    await withConfirmation(async () => {
      let base64 = '';
      if (_data.thumbnail instanceof FileList) {
        try {
          base64 = await fileToBase64(_data.thumbnail[0]);
        } catch (error) {
          toast.error('Error while converting thumbnail to base64');
        }
      }

      const finalData = {
        name: _data.name,
        extId: _data.extId,
        description: _data.description,
        price: _data.price,
        revenueModel: _data.revenueModel,
        type: _data.type,
        default: _data.default,
        platforms: _data.platforms.map((platform: any) => platform.value),
        thumbnail: base64.length > 0 ? base64 : undefined,
      };

      try {
        if (action === 'edit') {
          await Packages.updatePackage(id, finalData);
          // @ts-ignore
          packagesActivityLogger(data, finalData);
        } else {
          await Packages.addPackage(finalData);
          await addLogger('Package');
        }
        handleSuccess(goBack, refetch, 'Package', action);
      } catch (error: any) {
        handleError(action, 'Package', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="Package" />
      </div>
      <ConfirmationModalContent name="Package" formConfirmationState={formConfirmationState}>
        <PackageFormFields
          data={data}
          action={action}
          register={register}
          control={control}
          errors={errors}
        />
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
