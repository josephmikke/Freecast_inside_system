import { request as httpRequest } from 'https';
import { parse } from 'url';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import {
  MediaTailorClient,
  ListPlaybackConfigurationsCommand,
  PlaybackConfiguration,
  PutPlaybackConfigurationCommand,
} from '@aws-sdk/client-mediatailor';

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
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  console.log('RESPONSE BODY:\n', responseBody);

  const parsedUrl = parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
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

export const filterByProjectAndStage = (
  items: PlaybackConfiguration[] | undefined,
  project: string,
  stage: string,
) => items?.filter(
  (item) => item.Tags?.project === project && item.Tags?.STAGE === stage,
) || [];

export const getMediaTailorConfigurations = async (
  client: MediaTailorClient,
  nextToken?: string,
  configurations: PlaybackConfiguration[] | [] = [],
): Promise<PlaybackConfiguration[] | []> => {
  const command = new ListPlaybackConfigurationsCommand({ NextToken: nextToken });
  const { NextToken, Items } = await client.send(command);
  const configurationsClone = [
    ...configurations,
    ...filterByProjectAndStage(Items, process.env.PROJECT!, process.env.STAGE!),
  ];
  if (NextToken) {
    return getMediaTailorConfigurations(client, NextToken, configurationsClone);
  }
  return configurationsClone;
};

export const addCDNToMediaTailorConfigurations = async (
  event: MediaTailorCustomResourceEvent,
  client: MediaTailorClient,
  configurations: PlaybackConfiguration[] | [] = [],
) => {
  const { AdCDN, SegmentCDN } = event.ResourceProperties;
  return Promise.all(configurations.map((config) => {
    const command = new PutPlaybackConfigurationCommand({
      ...config,
      Name: config.Name,
      CdnConfiguration: {
        AdSegmentUrlPrefix: `https://${AdCDN}`,
        ContentSegmentUrlPrefix: `https://${SegmentCDN}`,
      },
    });

    return client.send(command);
  }));
};

export default async (event: MediaTailorCustomResourceEvent, context: Context) => {
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
    const configurations = await getMediaTailorConfigurations(client);
    await addCDNToMediaTailorConfigurations(event, client, configurations);
    return await sendResponse(
      event,
      context,
      'SUCCESS',
      { message: 'CDN added to MediaTailor configs' },
    );
  } catch (e) {
    return sendResponse(event, context, 'FAILED', e);
  }
};
