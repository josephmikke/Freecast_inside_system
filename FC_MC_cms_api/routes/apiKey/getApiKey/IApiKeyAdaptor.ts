export interface IApiKeyAdaptor {
  retrieveApiKey(identifier: string): Promise<string>
}
