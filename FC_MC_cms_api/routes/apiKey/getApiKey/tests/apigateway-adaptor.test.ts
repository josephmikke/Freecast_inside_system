import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { mockClient } from 'aws-sdk-client-mock';

import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import ApiKeyAdaptor from '../ApiKeyAdaptor';
import GetApiKeyDomain from '../GetApiKeyDomain';

import eventMock from './event-mock';

describe('GetApiKey - ApiGatewayAdaptor', () => {
  const OLD_ENV = process.env;
  const apiGatewayClient = new APIGatewayClient({});
  const apiGatewayClientMock = mockClient(apiGatewayClient);

  beforeEach(() => {
    jest.resetModules();
    apiGatewayClientMock.reset();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should return an API Key for dev environment', async () => {
    // Arrange
    process.env.ENV = 'dev';
    apiGatewayClientMock.resolves({
      items: [{
        value: 'dev-key',
      }],
    });
    const apiKeyAdaptor = new ApiKeyAdaptor(apiGatewayClient);
    const domain = new GetApiKeyDomain(apiKeyAdaptor);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    // Act
    const result = await apiGatewayAdaptor.handler(eventMock);

    // Assert
    expect(result).toEqual({
      body: '{"apiKey":"dev-key"}',
      statusCode: 200,
    });
  });

  it('should return API Key Not Found Exception', async () => {
    // Arrange
    process.env.ENV = 'dev';
    apiGatewayClientMock.resolves({
      items: [],
    });
    const apiKeyAdaptor = new ApiKeyAdaptor(apiGatewayClient);
    const domain = new GetApiKeyDomain(apiKeyAdaptor);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    // Act
    const result = await apiGatewayAdaptor.handler(eventMock);

    // Assert
    expect(result).toEqual({
      body: '{"error":"API Key not found"}',
      statusCode: 404,
    });
  });

  it('should throw an Unknown Exception', async () => {
    // Arrange
    process.env.ENV = 'dev';
    apiGatewayClientMock.rejects({});
    const apiKeyAdaptor = new ApiKeyAdaptor(apiGatewayClient);
    const domain = new GetApiKeyDomain(apiKeyAdaptor);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    // Act
    const result = await apiGatewayAdaptor.handler(eventMock);

    // Assert
    expect(result).toEqual({
      body: '{"error":"Error"}',
      statusCode: 500,
    });
  });
});
