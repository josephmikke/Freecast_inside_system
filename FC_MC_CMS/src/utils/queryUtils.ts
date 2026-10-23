import { OptionType } from '@components/filtersAndSorters/Sorters';

export const findLabelByValue = (value: string, categories: OptionType[]): string | undefined => {
  const category = categories.find((cat) => cat.value === value);
  return category ? category.label : undefined;
};

export const parseActiveQueryParam = (value: string | null): OptionType | undefined => {
  if (!value) return undefined;
  return value === 'true'
    ? { label: 'Is active', value: 'true' }
    : { label: 'Is inactive', value: 'false' };
};

export const parseQueryParams = (
  value: string | null,
  options: OptionType[],
): OptionType[] => {
  if (!value || !options) return [];

  return value.split(',').map((val) => {
    const label = findLabelByValue(val, options);
    return {
      label: label || undefined,
      value: val,
    };
  });
};
