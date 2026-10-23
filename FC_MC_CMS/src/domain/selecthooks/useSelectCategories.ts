import { useMemo } from 'react';
import { Categories } from '@api/index';
import { CategoryResult } from '@entities/configurations/category';

interface UseSelectCategoriesReturn {
  categories: { label: string, value: string, weight: number }[];
  categoriesIsFetching: boolean;
}

export default function useSelectCategories(): UseSelectCategoriesReturn {
  const {
    data: categoriesData,
    error: categoriesError,
    isFetching: categoriesIsFetching,
  } = Categories.useCategories();

  return useMemo<UseSelectCategoriesReturn>(
    () => {
      if (!categoriesData?.data?.categories || categoriesError || categoriesIsFetching) {
        return { categories: [], categoriesIsFetching };
      }
      return {
        categories: categoriesData
          ?.data?.categories
          ?.filter((cat: CategoryResult) => cat.enabled)
          ?.map((cat: CategoryResult) => ({
            label: cat.name, value: cat.id, weight: cat.weight,
          })),
        categoriesIsFetching,
      };
    },
    [categoriesError, categoriesData, categoriesIsFetching],
  );
}
