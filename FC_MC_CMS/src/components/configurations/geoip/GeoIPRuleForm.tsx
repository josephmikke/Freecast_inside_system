import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import FormTitle from '@components/commons/forms/FormTitle';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import { GeoIpRules } from '@api/index';
import GeoIPRulesFormFields from '@components/configurations/geoip/GeoIPRulesFormFields';
import validationSchema from '@components/configurations/geoip/validationSchema';
import { GeoIPRulePayload } from '@entities/configurations/geoiprule';
import addLogger from '@/activityLogger/common/add-logger';

interface GeoIPRuleFormProps {
  refetch: () => void;
  action: 'add' | 'edit';
  data?: any;
}

export default function GeoIPRuleForm({
  refetch,
  action,
  data,
}: GeoIPRuleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<GeoIPRulePayload>({ resolver: yupResolver(validationSchema), values: data });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { withConfirmation, loading, formConfirmationState } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: GeoIPRulePayload) => {
    await withConfirmation(async () => {
      // @ts-ignore
      const finalData: GeoIPRulePayload = {
        name: d.name,
        description: d.description,
        policyType: d.policyType,
        // @ts-ignore
        ruleType: d.ruleType === 'SPECIFIC_IP' || d.ruleType === 'SUBNET' ? 'CIDR' : d.ruleType,
        // @ts-ignore
        // eslint-disable-next-line no-nested-ternary
        value: d.ruleType === 'SPECIFIC_IP' ? `${d.value}/32` : d.ruleType === 'LOCATION' ? d.location.value : d.value,
        // @ts-ignore
        packages: d.packages?.map((p) => p.value) || [],
      };

      try {
        if (action === 'add') {
          await GeoIpRules.addGeoIpRule(finalData);
          await addLogger('GeoIP Rule');
        }
        handleSuccess(goBack, refetch, 'GeoIP Rule', action);
      } catch (error: any) {
        handleError(action, 'GeoIP Rule', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="GeoIP Rule" />
      </div>
      <ConfirmationModalContent name="Location" formConfirmationState={formConfirmationState}>
        <GeoIPRulesFormFields
          setValue={setValue}
          action={action}
          register={register}
          errors={errors}
          data={data}
          control={control}
        />
      </ConfirmationModalContent>
      {action === 'add' && (
        <CancelOrSubmitForm loading={loading} action={action} />
      )}
      {action === 'edit' && (
        <div className="flex flex-row justify-center gap-4">
          <button
            type="button"
            className="rounded-xl p-2 bg-gray-light w-32"
            onClick={() => goBack()}
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
