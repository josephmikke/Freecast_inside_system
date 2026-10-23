import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().nullable(),
  type: Yup.string().required('Location Type is required'),
  id: Yup.string(),
  slug: Yup.string().required('Slug is required'),
  packages: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
  countries: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
  states: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
  zipCodes: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
  cities: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
});

export default validationSchema;
