import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export interface ISecretManager {
  retrieve(secretName: string): Promise<string | undefined>;
}

export default class SecretManager implements ISecretManager {
  constructor(private readonly client: SecretsManagerClient) {

  }

  async retrieve(secretName: string): Promise<string | undefined> {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });
    const { SecretString } = await this.client.send(command);
    return SecretString;
  }
}
