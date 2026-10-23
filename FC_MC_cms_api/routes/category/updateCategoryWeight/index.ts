import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import { UpdateCategoryWeightEvent } from '../../shared/dto/CategoryDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import CategoryMap from '../shared/CategoryMap';
import CategoryRepository from '../shared/CategoryRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import UpdateCategoryWeightDomain from './UpdateCategoryWeightDomain';

const SERVICE_NAME = 'FreeCast-API-updateCategoryWeight';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const categoryMap = new CategoryMap(uid);
const ddbClient = new DynamoDBClient({});
const categoryRepository = new CategoryRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  categoryMap,
);
const domain = new UpdateCategoryWeightDomain(categoryRepository, categoryMap);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const addCategoryHandler = async (event: UpdateCategoryWeightEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<UpdateCategoryWeightEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(addCategoryHandler);
