import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateCategoryEvent } from '../../shared/dto/CategoryDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CategoryError } from '../shared/CategoryError';

import { IUpdateCategoryDomain } from './IUpdateCategoryDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateCategoryEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateCategoryDomain;

  constructor(domain: IUpdateCategoryDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateCategoryEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateCategory(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/categories/${pathParameters.id}`,
        },
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
        case e instanceof CategoryError.CategoryAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Category Already Exist',
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
