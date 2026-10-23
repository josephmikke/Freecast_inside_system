import * as Yup from 'yup';

export default function validationSchema(action: 'add' | 'edit') {
  return Yup.object().shape({
    thumbnail: action === 'add' ? Yup.mixed().test('required', 'Thumbnail is required', (value) => value && value.length > 0) : Yup.mixed(),
    alternateThumbnail: action === 'add' ? Yup.mixed().test('required', 'Alternate thumbnail is required', (value) => value && value.length > 0) : Yup.mixed(),
    name: Yup.string().required(),
    season: Yup.number().required(),
    number: Yup.number().required(),
    slug: Yup.string().required(),
    id: Yup.string(),
    duration: Yup.string(),
    availableDate: Yup.string().required(),
    expirationDate: Yup.string().required(),
    originalAirDate: Yup.string().required(),
    rating: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Rating is required'),
    description: Yup.string().required(),
    contentData: Yup.string().required(),

    streams: Yup.array().of(Yup.object().shape({
      name: Yup.string().required('Name is required'),
      data: Yup.string().required('Data is required'),
      type: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Type is required'),
      format: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Format is required'),
      daiParams: Yup.boolean().required('DAI Params is required'),
    })).min(1).required('Streams are required'),
  });
}
