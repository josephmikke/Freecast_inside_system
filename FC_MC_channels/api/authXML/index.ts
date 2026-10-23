import { APIGatewayProxyResult } from 'aws-lambda';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import moment from 'moment/moment';
import AuthXML from './AuthXML';
import UIDGenerator from './UIDGenerator';
import SecretManager from './SecretManager';

export default async (): Promise<APIGatewayProxyResult> => {
  const now = moment.utc();
  const secretManager = new SecretManager(new SecretsManagerClient({}));
  const privateKey = await secretManager.retrieve(process.env.SECRET_NAME!);
  if (!privateKey) {
    return {
      body: JSON.stringify({
        response: "Can't find private key!",
      }),
      statusCode: 404,
    };
  }
  const authXML = new AuthXML(privateKey, new UIDGenerator())
    .allowFairPlay()
    .allowPlayReady()
    .allowWidevine()
    .setRSAPubKeyId(process.env.PUBKEY_ID!)
    .setGenerationTime(now.format('YYYY-MM-DD HH:mm:ss.SSS'))
    .setExpirationTime(now.add(1, 'month').format('YYYY-MM-DD HH:mm:ss.SSS'))
    .update();
  return {
    body: JSON.stringify({
      base64: authXML.getBase64(),
      xml: authXML.getXML(),
      widevineLaUrl: 'https://widevine.keyos.com/api/v4/getLicense',
      fairplayLaUrl: 'https://fairplay.keyos.com/api/v4/getLicense',
      fairplayPubCertUrl: process.env.FP_PUB_CERT_URL!,
      headerName: 'x-keyos-authorization',
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  };
};
