import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  id: Yup.string(),
  subtitle: Yup.string().nullable(),
  thumbnail: Yup.mixed(),
  alternateThumbnail: Yup.mixed(),
  catchup: Yup.boolean(),
  archive: Yup.boolean(),
  description: Yup.string().nullable(),
  duration: Yup.string(),
  ext_id: Yup.string(),
  rating: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).nullable(),
  slug: Yup.string().nullable(),
  start_time: Yup.string().required('Start time is required'),
  end_time: Yup.string().required('End time is required'),
  start_date: Yup.string().required('Start date is required'),
  end_date: Yup.string().required('End date is required'),
  title: Yup.string().required('Title is required'),
});

export default validationSchema;
