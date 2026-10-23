import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  extId: Yup.string().required('Slug is required'),
  mtSlug: Yup.string().when('type', {
    is: (type: any[]) => type?.some((t: any) => t.value === 'VOD'),
    then: (schema) => schema.required('MTSlug is required for VOD providers'),
    otherwise: (schema) => schema.nullable(),
  }),
  hlsMtSlug: Yup.string().when('type', {
    is: (type: any[]) => type?.some((t: any) => t.value === 'VOD'),
    then: (schema) => schema.required('HLS MTSlug is required for VOD providers'),
    otherwise: (schema) => schema.nullable(),
  }),
  aidSlug: Yup.string().when('type', {
    is: (type: any[]) => type?.some((t: any) => t.value === 'VOD'),
    then: (schema) => schema.required('AID Slug is required for VOD providers').matches(/^\d+$/, 'AID Slug must contain only numbers'),
    otherwise: (schema) => schema.nullable(),
  }),
  type: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })).required('Content Provided is required'),
  subscription: Yup.boolean().required('Subscription Required is required'),
  format: Yup.string().required('Channel Number Format is required'),
  configuration: Yup.object(),
  packages: Yup.array().of(Yup.object().shape({ value: Yup.string(), label: Yup.string() })),
});

export default validationSchema;
