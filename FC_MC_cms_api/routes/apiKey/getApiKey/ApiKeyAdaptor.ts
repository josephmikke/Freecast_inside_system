import { APIGatewayClient, GetApiKeysCommand } from '@aws-sdk/client-api-gateway';

import { ApiKeyError } from './ApiKeyError';
import { IApiKeyAdaptor } from './IApiKeyAdaptor';

export default class ApiKeyAdaptor implements IApiKeyAdaptor {
  constructor(private readonly apiGatewayClient: APIGatewayClient) {
  }

  async retrieveApiKey(identifier: string): Promise<string> {
    try {
      const command = new GetApiKeysCommand({
        nameQuery: identifier,
        includeValues: true,
      });
      const { items } = await this.apiGatewayClient.send(command);
      if (!items?.length) throw new ApiKeyError.EmptyApiKey();
      return items[0].value!;
    } catch (e) {
      if (e instanceof ApiKeyError.EmptyApiKey) throw new ApiKeyError.EmptyApiKey();
      throw new ApiKeyError.UnknownError(e);
    }
  }
}
