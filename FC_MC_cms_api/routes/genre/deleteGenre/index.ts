import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import { DeleteGenreEvent } from '../../shared/dto/GenreDto';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import GenreMap from '../shared/GenreMap';
import GenreRepository from '../shared/GenreRepository';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import DeleteGenreDomain from './DeleteGenreDomain';

const SERVICE_NAME = 'FreeCast-API-updateGenre';
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
const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);

const domain = new DeleteGenreDomain(genreRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const deleteGenreHandler = async (event: DeleteGenreEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<DeleteGenreEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(deleteGenreHandler);
