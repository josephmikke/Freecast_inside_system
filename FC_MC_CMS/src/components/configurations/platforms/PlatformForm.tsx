import React from 'react';
import * as Yup from 'yup';
import NameValueForm from '@components/commons/forms/NameValueForm';
import { Platforms } from '@api/index';
import platformsActivityLogger from '@/activityLogger/configurations/platforms';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('Slug is required'),
});

interface PlatformFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
}

export default function PlatformForm({
  action,
  id,
  data,
  refetch,
}: PlatformFormProps) {
  return (
    <NameValueForm
      id={id}
      data={data}
      refetch={refetch}
      action={action}
      validationSchema={validationSchema}
      name="Platform"
      valueName="Slug"
      addEntity={Platforms.addPlatform}
      updateEntity={Platforms.updatePlatform}
      activityLogger={platformsActivityLogger}
    />
  );
}
