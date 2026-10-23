import React from 'react';
import * as Yup from 'yup';
import { Categories } from '@api/index';
import NameValueForm from '@components/commons/forms/NameValueForm';
import categoryActivityLogger from '@/activityLogger/configurations/categories';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('ID is required'),
});

interface CategoryFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
}

export default function CategoryForm({
  action,
  id,
  data,
  refetch,
}: CategoryFormProps) {
  return (
    <NameValueForm
      id={id}
      data={data}
      refetch={refetch}
      action={action}
      validationSchema={validationSchema}
      name="Category"
      valueName="ID"
      addEntity={Categories.addCategory}
      updateEntity={Categories.updateCategory}
      activityLogger={categoryActivityLogger}
    />
  );
}
