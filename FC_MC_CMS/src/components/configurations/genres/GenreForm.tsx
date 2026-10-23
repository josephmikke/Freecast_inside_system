import React from 'react';
import * as Yup from 'yup';
import { Genres } from '@api/index';
import NameValueForm from '@components/commons/forms/NameValueForm';
import genresActivityLogger from '@/activityLogger/configurations/genres';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('ID is required'),
});

interface GenreFormProps {
  action: 'add' | 'edit';
  id?: string;
  data?: any;
  refetch: () => void;
}

export default function GenreForm({
  action,
  id,
  data,
  refetch,
}: GenreFormProps) {
  return (
    <NameValueForm
      id={id}
      data={data}
      refetch={refetch}
      action={action}
      validationSchema={validationSchema}
      name="Genre"
      valueName="ID"
      addEntity={Genres.addGenre}
      updateEntity={Genres.updateGenre}
      activityLogger={genresActivityLogger}
    />
  );
}
