export interface IGetApiKeyDomain {
  getApiKey(environment: 'dev|test|prod'): Promise<string>
}
