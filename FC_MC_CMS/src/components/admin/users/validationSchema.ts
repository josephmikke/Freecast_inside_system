import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  permissions: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
});

export default validationSchema;
