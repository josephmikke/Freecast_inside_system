import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteCategoryEvent } from '../../shared/dto/CategoryDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CategoryError } from '../shared/CategoryError';

import { IDeleteCategoryDomain } from './IDeleteCategoryDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteCategoryEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteCategoryDomain;

  constructor(domain: IDeleteCategoryDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteCategoryEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deleteCategory(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof CategoryError.CategoryNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Category Not Found',
            }),
          };
        case e instanceof CategoryError.CategoryHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Category with dependencies',
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
