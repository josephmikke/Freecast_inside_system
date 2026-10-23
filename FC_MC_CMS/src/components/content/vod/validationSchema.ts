import * as Yup from 'yup';

const streamYup = Yup.array().of(Yup.object().shape({
  id: Yup.string(),
  name: Yup.string().required('Name is required'),
  data: Yup.string().required('Data is required'),
  type: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Type is required'),
  format: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Format is required'),
  daiParams: Yup.boolean().required('DAI Params is required'),
}));

export default function validationSchema(action: 'add' | 'edit', type: 'movies' | 'shows') {
  return Yup.object().shape({
    name: Yup.string().required('Name is required'),
    id: Yup.string(),
    contentData: Yup.string(),
    imdbId: Yup.string().nullable(),
    slug: Yup.string().required('Slug is required'),
    tmdbId: Yup.string().nullable(),
    rating: Yup.object().shape({ label: Yup.string().required(), value: Yup.string().required() }).required('Rating is required'),
    vastId: Yup.string().nullable(),
    provider: Yup.object().shape({ value: Yup.string().required(), label: Yup.string().required() }).required('Provider is required'),
    availableDate: Yup.string().required('Available Date is required'),
    expirationDate: Yup.string().nullable(),
    description: Yup.string().required('Description is required'),
    releaseYear: Yup.string().nullable(),
    packages: Yup.array().of(Yup.object().shape({ label: Yup.string().required(), value: Yup.string().required() })).required('Packages are required'),
    categories: Yup.array().of(
      Yup.object().shape({
        weight: Yup.number().nullable(),
        label: Yup.string().required(),
        value: Yup.string().required(),
      }),
    ),
    platforms: Yup.array().of(Yup.object().shape({ category: Yup.string(), weight: Yup.number() })),
    distributors: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    brands: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })).required('Brands are required'),
    genres: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    locations: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    thumbnail: action === 'add' ? Yup.mixed().test('required', 'Main image is required', (value) => value && value.length > 0) : Yup.mixed(),
    alternateThumbnail: Yup.mixed(),
    backgroundThumbnail: action === 'add' ? Yup.mixed().test('required', 'Background image is required', (value) => value && value.length > 0) : Yup.mixed(),

    streams: type === 'movies'
      ? streamYup.min(1).required('Streams are required')
      : streamYup,
  });
}
