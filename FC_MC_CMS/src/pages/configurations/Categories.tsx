import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { Categories } from '@api/index';
import { Configurations } from '@components/index';
import { CategoryResult } from '@entities/configurations/category';

interface CategoriesPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function CategoriesPage({ action }: CategoriesPageProps) {
  return (
    <EntityModalFormTablePage<CategoryResult>
      action={action}
      useData={Categories.useCategories}
      title="Categories"
      desc="List of Categories that can be used across most areas of the CMS."
      Form={Configurations.CategoryForm}
      Table={Configurations.CategoriesTable}
      dataFieldName="categories"
    />
  );
}
