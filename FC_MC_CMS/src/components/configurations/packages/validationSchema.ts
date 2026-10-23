import * as Yup from 'yup';

const validationSchema = (action: 'edit' | 'add') => Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('Slug is required'),
  description: Yup.string().required('Description is required'),
  price: Yup.mixed().test((v) => (v ? !Number.isNaN(v) : true)),
  geoIpRules: Yup.array().of(Yup.string()),
  revenueModel: Yup.string().required('Revenue Model is required'),
  type: Yup.string().required('Package Type is required'),
  default: Yup.boolean().required('Default Package is required'),
  platforms: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })).required('Platforms are required'),
  thumbnail: action === 'add' ? Yup.mixed().test('required', 'Thumbnail is required', (value) => value && value.length > 0) : Yup.mixed(),
});

export default validationSchema;
