import * as Yup from 'yup';

export default function validationSchema() {
  return Yup.object().shape({
    url: Yup.string().required('Name is required'),
    mapping: Yup.object().required('Mapping is required'),
    isPrivate: Yup.boolean().required('Private is required'),
    provider: Yup.object().shape({ value: Yup.string(), label: Yup.string() }),
    packages: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    brands: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    locations: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    platforms: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
    distributors: Yup.array().of(Yup.object().shape({ label: Yup.string(), value: Yup.string() })),
  });
}
