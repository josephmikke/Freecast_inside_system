import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import FormTitle from '@components/commons/forms/FormTitle';
import ChannelMonitorFormFields from '@components/content/channelmonitor/ChannelMonitorFormFields';
import handleError from '@components/commons/forms/handleError';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import handleSuccess from '@components/commons/forms/handleSuccess';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import validationSchema from '@components/configurations/providers/validationSchema';
import { Providers } from '@api/index';
import { ProviderPayload, ProviderResult } from '@entities/configurations/provider';
import providerActivityLogger from '@/activityLogger/configurations/providers';
import addLogger from '@/activityLogger/common/add-logger';

interface ChannelMonitorFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: ProviderResult;
  refetch: () => void;
}

export default function ChannelMonitorForm({
  action,
  id,
  data,
  refetch,
}: ChannelMonitorFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProviderPayload>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, formConfirmationState, loading } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: ProviderPayload) => {
    await withConfirmation(async () => {
      const finalData: ProviderPayload = {
        name: d.name,
        extId: d.extId,
        type: d.type.map((t: any) => t.value),
        format: d.format,
        subscription: d.subscription,
        configuration: d.configuration || {},
      };

      try {
        if (action === 'edit') {
          await Providers.updateProvider(id!, finalData);
          providerActivityLogger(data!, finalData);
        } else {
          await Providers.addProvider(finalData);
          await addLogger('Provider');
        }
        handleSuccess(goBack, refetch, 'Provider', action);
      } catch (error: any) {
        handleError(action, 'Provider', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="Provider" />
      </div>
      <ConfirmationModalContent name="Provider" formConfirmationState={formConfirmationState}>
        <ChannelMonitorFormFields register={register} errors={errors} control={control} />
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
