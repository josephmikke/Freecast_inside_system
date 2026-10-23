import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  mapping: Yup.object(),
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('ID is required'),
  templateType: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Template Type is required'),
});

export default validationSchema;
