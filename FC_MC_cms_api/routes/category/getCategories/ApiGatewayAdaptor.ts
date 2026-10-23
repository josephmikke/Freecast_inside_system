import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetCategoriesEvent } from '../../shared/dto/CategoryDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetCategoriesDomain } from './IGetCategoriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetCategoriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetCategoriesDomain;

  constructor(domain: IGetCategoriesDomain) {
    this.domain = domain;
  }

  async handler(_event: GetCategoriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const categories = await this.domain.getCategories();
      return {
        statusCode: 200,
        body: JSON.stringify({
          categories,
        }),
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
