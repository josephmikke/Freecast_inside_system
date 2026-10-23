import { Event } from '@middy/http-json-body-parser';

export type CategoryDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  extId: string;
  enabled?: boolean;
  weight: number;
};

export type CategoryRequestDto = {
  name: string;
  extId: string;
  enabled?: boolean;
};

export type GetCategoriesEvent = {
} & Event;

export type UpdateCategoryEvent = {
  body: Partial<CategoryRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdateCategoryWeightEvent = {
  pathParameters: {
    id: string;
    index: string;
  }
} & Event;

export type DeleteCategoryEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddCategoryEvent = {
  body: CategoryRequestDto
} & Event;
