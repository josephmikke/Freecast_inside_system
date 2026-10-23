import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { FieldRadio } from '@components/form';
import { Locations } from '@api/index';
import FormTitle from '@components/commons/forms/FormTitle';
import CancelOrSubmitForm from '@components/commons/forms/CancelOrSubmitForm';
import handleSuccess from '@components/commons/forms/handleSuccess';
import handleError from '@components/commons/forms/handleError';
import useFormConfirmation from '@components/commons/forms/useFormConfirmation';
import ConfirmationModalContent from '@components/commons/forms/ConfirmationModalContent';
import CommonLocationDetails from '@components/configurations/locations/fields/CommonLocationFields';
import LocationDetails from '@components/configurations/locations/fields/LocationDetails';
import validationSchema from '@components/configurations/locations/validationSchema';
import { LocationPayload } from '@entities/configurations/location';
import locationActivityLogger from '@/activityLogger/configurations/locations';
import addLogger from '@/activityLogger/common/add-logger';

interface LocationFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
  allLocations: any[];
}

export default function LocationForm({
  action,
  id,
  data,
  refetch,
  allLocations,
}: LocationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LocationPayload>({ resolver: yupResolver(validationSchema), values: data });
  const { withConfirmation, loading, formConfirmationState } = useFormConfirmation(action);
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const onSubmit = async (d: LocationPayload) => {
    await withConfirmation(async () => {
      // @ts-ignore
      // Do not need extId.
      const finalData: LocationPayload = {
        name: d.name,
        // extId: d.name,
        type: d.type,
        slug: d.slug,
      };

      switch (finalData.type) {
        case 'COUNTRY':
          finalData.packages = (d.packages || []).map((p: any) => p.value);
          break;
        case 'STATE':
          finalData.packages = d.packages?.map((p: any) => p.value);
          finalData.countries = d.countries?.map((p: any) => p.value);
          break;
        case 'CITY':
          finalData.packages = d.packages?.map((p: any) => p.value);
          finalData.states = d.states?.map((p: any) => p.value);
          break;
        case 'ZIPCODE':
          finalData.packages = d.packages?.map((p: any) => p.value);
          finalData.cities = d.cities?.map((p: any) => p.value);
          break;
        case 'PACKAGE':
          break;
        default:
          break;
      }

      try {
        if (action === 'edit') {
          await Locations.updateLocation(id!, finalData);
          locationActivityLogger(data, finalData);
        } else {
          await Locations.addLocation(finalData);
          await addLogger('Location');
        }
        handleSuccess(goBack, refetch, 'Location', action);
      } catch (error: any) {
        handleError(action, 'Location', error?.response?.data?.error);
      }
    });
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row">
        <FormTitle action={action} title="Location" />
      </div>
      <ConfirmationModalContent name="Location" formConfirmationState={formConfirmationState}>
        <div className="flex flex-row">
          <div>
            <FieldRadio
              containerClassName="!min-w-[180px]"
              label="Location Type"
              name="type"
              values={['COUNTRY', 'STATE', 'CITY', 'ZIPCODE', 'PACKAGE']}
              control={control}
              errors={errors}
            />
          </div>
          <CommonLocationDetails
            register={register}
            errors={errors}
            control={control}
            name="type"
          />
          <LocationDetails
            allLocations={allLocations}
            name="type"
            control={control}
            errors={errors}
          />
        </div>
      </ConfirmationModalContent>
      <CancelOrSubmitForm loading={loading} action={action} />
    </form>
  );
}
