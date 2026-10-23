import { ProviderPayload, ProviderResult } from '@entities/configurations/provider';
import {
  checkArray,
  checkEntity,
  checkObject,
  checkSimpleValue,
} from '@/activityLogger/common/checkers';

export default function providerActivityLogger(
  providerBase: ProviderResult,
  providerUpdated: ProviderPayload,
) {
  const updatedFields = checkEntity(providerBase, providerUpdated, {
    configuration: checkObject,
    extId: checkSimpleValue,
    format: checkSimpleValue,
    name: checkSimpleValue,
    type: checkArray,
    subscription: checkSimpleValue,
    mtSlug: checkSimpleValue,
    hlsMtSlug: checkSimpleValue,
    aidSlug: checkSimpleValue,
  });

  console.log(updatedFields);
}
