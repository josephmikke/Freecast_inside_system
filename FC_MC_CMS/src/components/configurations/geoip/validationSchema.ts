import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required').matches(/^[\w-]+$/, 'Invalid name format (alphanumeric characters, underscores and dashes only)'),
  description: Yup.string().required('Description is required'),
  packages: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
  policyType: Yup.string().required('Policy Type is required'),
  ruleType: Yup.string(),
  value: Yup.string(),
  location: Yup.object().shape({ label: Yup.string(), value: Yup.string() }),
});

export default validationSchema;
