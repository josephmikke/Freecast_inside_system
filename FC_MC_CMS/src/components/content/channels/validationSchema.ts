import * as Yup from 'yup';

export function checkIfUserHasStartedToFillEpg(value: any) {
  if (!value) return false;
  return value?.epgTemplate
    || value?.ingestionUrl
    || value?.name
    || value?.schedule
    || value?.timezone;
}

export default function validationSchema(action: 'add' | 'edit') {
  return Yup.object().shape({
    name: Yup.string().required('Name is required'),
    slug: Yup.string().required('Slug is required'),
    id: Yup.string(),
    lcn: Yup.string().required('LCN is required'),
    provider: Yup.object().shape({ value: Yup.string().required(), label: Yup.string().required() }).required('Provider is required'),
    vastId: Yup.string().nullable(),
    mediapackageId: Yup.string(),
    rating: Yup.object().shape({ label: Yup.string().required(), value: Yup.string().required() }).required('Rating is required'),
    availableDate: Yup.string().required('Available Date is required'),
    expirationDate: Yup.string().nullable(),
    description: Yup.string().required('Description is required'),
    platforms: Yup.array().of(Yup.object().shape({ category: Yup.string(), weight: Yup.number() })),
    catchUpActive: Yup.boolean().required('Chatch-up Active is required'),
    visible: Yup.boolean().required('Visible to Users is required'),
    packages: Yup.array().of(Yup.object().shape({ label: Yup.string().required(), value: Yup.string().required() })).min(1).required('Packages are required'),
    categories: Yup.array().of(Yup.object().shape({ weight: Yup.string(), label: Yup.string().required(), value: Yup.string().required() })).min(1).required('Categories are required'),
    distributors: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    brands: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    genres: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    locations: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    thumbnail: action === 'add' ? Yup.mixed().test('required', 'Thumbnail is required', (value) => value && value.length > 0) : Yup.mixed(),

    streams: Yup.array().of(Yup.object().shape({
      name: Yup.string().required('Name is required'),
      data: Yup.string().required('Data is required'),
      type: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Type is required'),
      format: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Format is required'),
      daiParams: Yup.boolean().required('DAI Params is required'),
    })).min(1).required('Streams are required'),

    epg: Yup.lazy((_value: any) => {
      if (checkIfUserHasStartedToFillEpg(_value)) {
        return Yup.object().shape({
          name: Yup.string().required('Name is required'),
          epgTemplate: Yup.object().required().shape({ label: Yup.string().required(), value: Yup.string().required() }).required('EPG Template is required'),
          ingestionUrl: Yup.string().required('Ingestion URL is required'),
          thumbnail: action === 'add' ? Yup.mixed().test('required', 'Thumbnail is required', (value) => value && value.length > 0) : Yup.mixed(),
          timezone: Yup.object().shape({ label: Yup.string(), value: Yup.string() }).required('Timezone is required'),
          schedule: Yup.object().shape({
            type: Yup.string().required('Type is required'),
            hourlyHour: Yup.string(),
            dailyHour: Yup.string(),
            weeklyHour: Yup.string(),
            weeklyDays: Yup.array().of(Yup.string()),
          }),
        });
      }
      return Yup.object();
    }),

  });
}
