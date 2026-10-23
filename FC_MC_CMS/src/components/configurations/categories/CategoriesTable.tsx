import React from 'react';
import { Categories } from '@api/index';
import CustomTable from '@components/commons/tables/CustomTable';
import useCategoriesColumns from '@components/configurations/categories/useCategoriesColumns';

interface CategoriesTableProps {
  data: any;
  refetch: () => void;
}

export default function CategoriesTable({ data, refetch }: CategoriesTableProps) {
  return (
    <CustomTable
      refetch={refetch}
      data={data}
      useColumns={useCategoriesColumns}
      getEditPath={(id: string) => `/configurations/categories/${id}/edit`}
      deleteEntity={Categories.deleteCategory}
      updateEntity={Categories.updateCategory}
      updateWeightEntity={Categories.updateWeightCategory}
      entityName="Category"
      isDraggable
    />
  );
}
