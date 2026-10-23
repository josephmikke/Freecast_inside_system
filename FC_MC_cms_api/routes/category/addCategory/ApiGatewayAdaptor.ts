import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddCategoryEvent } from '../../shared/dto/CategoryDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CategoryError } from '../shared/CategoryError';

import { IAddCategoryDomain } from './IAddCategoryDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddCategoryEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddCategoryDomain;

  constructor(domain: IAddCategoryDomain) {
    this.domain = domain;
  }

  async handler(event: AddCategoryEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { body } = event;
    try {
      const category = await this.domain.addNewCategory(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/categories/${category.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof CategoryError.CategoryAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Category already exist',
            }),
          };

        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
