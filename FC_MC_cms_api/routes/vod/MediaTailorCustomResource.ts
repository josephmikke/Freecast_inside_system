import { request as httpRequest } from 'https';

import {
  PlaybackConfiguration,
  GetPlaybackConfigurationCommand,
  MediaTailorClient,
  PutPlaybackConfigurationCommand,
} from '@aws-sdk/client-mediatailor';

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

export type MediaTailorCustomResourceEvent = {
  ResourceProperties: {
    SegmentCDN: string;
    AdCDN: string;
    Region: string;
  }
} & CloudFormationCustomResourceEvent;

export const sendResponse = (
  event: CloudFormationCustomResourceEvent,
  context: Context,
  responseStatus: 'SUCCESS' | 'FAILED',
  responseData?: any,
) => {
  // Use existing PhysicalResourceId for UPDATE/DELETE, or create new one for CREATE
  const physicalResourceId = event.RequestType === 'Create' 
    ? context.logStreamName 
    : (event.PhysicalResourceId || context.logStreamName);
    
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  console.log('RESPONSE BODY:\n', responseBody);

  const parsedUrl = new URL(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length,
    },
  };

  console.log('SENDING RESPONSE...\n');

  return new Promise((resolve, reject) => {
    const request = httpRequest(options, (response) => {
      console.log(`STATUS: ${response.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
      if (response.statusCode! < 200 || response.statusCode! >= 300) {
        reject(new Error(JSON.stringify({
          statusCode: response.statusCode,
          body: response.statusMessage,
        })));
      }
      resolve({
        statusCode: response.statusCode,
        body: response.statusMessage,
      });
    });

    request.on('error', (error) => {
      console.log(`sendResponse Error:${error}`);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
};

export const getMediaTailorConfiguration = async (
  client: MediaTailorClient,
): Promise<PlaybackConfiguration> => {
  const command = new GetPlaybackConfigurationCommand({ Name: `${process.env.ENV!}-vod` });
  return client.send(command);
};

export const addCDNToMediaTailorConfiguration = async (
  event: MediaTailorCustomResourceEvent,
  client: MediaTailorClient,
  configurations: PlaybackConfiguration,
) => {
  const { AdCDN, SegmentCDN } = event.ResourceProperties;
  const command = new PutPlaybackConfigurationCommand({
    ...configurations,
    Name: configurations.Name,
    CdnConfiguration: {
      AdSegmentUrlPrefix: `https://${AdCDN}`,
      ContentSegmentUrlPrefix: `https://${SegmentCDN}`,
    },
  });

  return client.send(command);
};

export const handler = async (event: MediaTailorCustomResourceEvent, context: Context) => {
  console.log(`REQUEST RECEIVED:\n${JSON.stringify(event)}`);
  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType === 'Delete') {
    return sendResponse(
      event,
      context,
      'SUCCESS',
      { message: 'Nothing to do, deletion in progress' },
    );
  }
  const client = new MediaTailorClient({
    region: event.ResourceProperties.Region,
  });

  try {
    const configuration = await getMediaTailorConfiguration(client);
    await addCDNToMediaTailorConfiguration(event, client, configuration);
    return await sendResponse(
      event,
      context,
      'SUCCESS',
      { message: 'CDN added to MediaTailor configs' },
    );
  } catch (e) {
    return await sendResponse(event, context, 'FAILED', e);
  } finally {
    // The region comes from the event, so this cannot be a module-level singleton like the
    // other clients. Release the keep-alive agent's sockets explicitly instead — nothing
    // else reclaims them, and the SDK holds them open with no idle timeout.
    client.destroy();
  }
};
