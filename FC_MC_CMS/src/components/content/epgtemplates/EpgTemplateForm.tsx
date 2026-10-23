import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import FormTitle from '@components/commons/forms/FormTitle';
import { EpgTemplate } from '@api/index';
import handleError from '@components/commons/forms/handleError';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import handleSuccess from '@components/commons/forms/handleSuccess';
import EpgTemplatesFormFields from '@components/content/epgtemplates/EpgTemplatesFormFields';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import validationSchema from '@components/content/epgtemplates/validationSchema';
import { EPGTemplatePayload } from '@entities/content/epgtemplate';
import epgTemplatesActivityLogger from '@/activityLogger/content/epgtemplates';
import addLogger from '@/activityLogger/common/add-logger';

interface EpgTemplateFormProps {
  action: 'add' | 'edit';
  id: string;
  data: any;
  refetch: () => void;
}

export default function EpgTemplateForm({
  action,
  id,
  data,
  refetch,
}: EpgTemplateFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    formState: { errors },
  } = useForm<EPGTemplatePayload>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, loading, formConfirmationState } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: any) => {
    await withConfirmation(async () => {
      const finalData: EPGTemplatePayload = {
        name: d.name,
        extId: d.extId,
        templateType: d.templateType.value,
        mapping: d.mapping,
      };

      try {
        if (action === 'edit') {
          await EpgTemplate.updateEpgTemplate(id, finalData);
          epgTemplatesActivityLogger(data, finalData);
        } else {
          await EpgTemplate.addEpgTemplate(finalData);
          await addLogger('EPG Template');
        }
        handleSuccess(goBack, refetch, 'EPG Template', action);
      } catch (error: any) {
        handleError(action, 'EPG Template', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="EPG Template" />
      </div>
      <ConfirmationModalContent name="EPG Template" formConfirmationState={formConfirmationState}>
        <EpgTemplatesFormFields
          getValues={getValues}
          watch={watch}
          register={register}
          errors={errors}
          control={control}
        />
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
