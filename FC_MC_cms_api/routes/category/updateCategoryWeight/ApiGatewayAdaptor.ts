import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateCategoryWeightEvent } from '../../shared/dto/CategoryDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CategoryError } from '../shared/CategoryError';

import { IUpdateCategoryWeightDomain } from './IUpdateCategoryWeightDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateCategoryWeightEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateCategoryWeightDomain;

  constructor(domain: IUpdateCategoryWeightDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateCategoryWeightEvent, _context?: Context)
    : Promise<APIGatewayProxyResult> {
    const { pathParameters } = event;
    try {
      await this.domain.updateCategoryWeight(pathParameters.id, pathParameters.index);
      return {
        statusCode: 207,
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
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
