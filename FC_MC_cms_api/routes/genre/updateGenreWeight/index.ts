import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import { UpdateGenreWeightEvent } from '../../shared/dto/GenreDto';
import GenreMap from '../shared/GenreMap';
import GenreRepository from '../shared/GenreRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import UpdateGenreWeightDomain from './UpdateGenreWeightDomain';

const SERVICE_NAME = 'FreeCast-API-updateGenreWeight';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const genreMap = new GenreMap(uid);
const ddbClient = new DynamoDBClient({});
const genreRepository = new GenreRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  genreMap,
);
const domain = new UpdateGenreWeightDomain(genreRepository, genreMap);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const updateGenreWeightHandler = async (event: UpdateGenreWeightEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<UpdateGenreWeightEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(updateGenreWeightHandler);
