import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SchedulerClient } from '@aws-sdk/client-scheduler';

import { Logger } from '@aws-lambda-powertools/logger';

import PackageFactory from '../../package/shared/PackageFactory';
import PackageRepository from '../../package/shared/PackageRepository';
import PlatformMap from '../../platform/shared/PlatformMap';
import PlatformRepository from '../../platform/shared/PlatformRepository';
import ProviderMap from '../../provider/shared/ProviderMap';
import ProviderRepository from '../../provider/shared/ProviderRepository';
import SchedulerAdaptor from '../../shared/scheduler/SchedulerAdaptor';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import AutoIngestionFactory from './AutoIngestionFactory';
import AutoIngestionRepository from './AutoIngestionRepository';
import AutoIngestionScheduler from './AutoIngestionScheduler';

export default function createAutoIngestionDependencies(logger: Logger) {
  const uid = new UIDGenerator();
  const ddbClient = new DynamoDBClient({});
  const platformMap = new PlatformMap(uid);
  const providerMap = new ProviderMap(uid);
  const platformRepository = new PlatformRepository(
    ddbClient,
    process.env.CMS_TABLE_NAME!,
    platformMap,
  );
  const providerRepository = new ProviderRepository(
    ddbClient,
    process.env.CMS_TABLE_NAME!,
    providerMap,
  );
  const packageFactory = new PackageFactory(uid, platformRepository);
  const packageRepository = new PackageRepository(
    ddbClient,
    process.env.CMS_TABLE_NAME!,
    packageFactory,
  );
  const autoIngestionFactory = new AutoIngestionFactory(
    uid,
    providerRepository,
    packageRepository,
    platformRepository,
  );
  const autoIngestionRepository = new AutoIngestionRepository(
    ddbClient,
    process.env.CMS_TABLE_NAME!,
    autoIngestionFactory,
  );
  const lambdaClient = new LambdaClient({});
  const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);
  const autoIngestionScheduler = new AutoIngestionScheduler(
    new SchedulerAdaptor(new SchedulerClient({})),
    process.env.AUTOINGESTION_SCHEDULER_ARN!,
    process.env.SCHEDULER_ROLE_ARN!,
  );

  return {
    autoIngestionFactory,
    autoIngestionRepository,
    logTracker,
    autoIngestionScheduler,
  };
}
