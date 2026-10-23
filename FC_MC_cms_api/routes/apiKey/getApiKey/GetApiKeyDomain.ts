import { IApiKeyAdaptor } from './IApiKeyAdaptor';
import { IGetApiKeyDomain } from './IGetApiKeyDomain';

export default class GetApiKeyDomain implements IGetApiKeyDomain {
  constructor(private readonly apiKeyAdaptor: IApiKeyAdaptor) {
  }

  getApiKey(environment: 'dev|test|prod'): Promise<string> {
    return this.apiKeyAdaptor.retrieveApiKey(`${environment}-cms`);
  }
}
