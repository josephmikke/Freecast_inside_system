import moment from 'moment';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { APIGatewayProxyEvent } from 'aws-lambda';
import SecretManager from '../authXML/SecretManager';
import AuthXML from '../authXML/AuthXML';
import UIDGenerator from '../authXML/UIDGenerator';

export default async (event: APIGatewayProxyEvent) => {
  console.log('event', JSON.stringify(event, null, 2));
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
    .setRSAPubKeyId('PUBKEY_ID') // TODO: change it to env variable
    .setGenerationTime(now.format('YYYY-MM-DD HH:mm:ss.SSS'))
    .setExpirationTime(now.add(1, 'month').format('YYYY-MM-DD HH:mm:ss.SSS'))
    .update();
  let allHeaders = { 'Content-Type': 'text/xml; charset=utf-8' };
  allHeaders = Object.assign(allHeaders, { 'x-keyos-authorization': authXML.getBase64() });
  const data = Buffer.from(event.body!, 'base64');
  console.log('data', data);

  const cert = await axios.post('https://wv-keyos.licensekeyserver.com/', data, { headers: allHeaders, responseType: 'arraybuffer' });
  return {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
    },
    statusCode: 200,
    body: Buffer.from(cert.data).toString('base64'),
    isBase64Encoded: true,
  };
};
