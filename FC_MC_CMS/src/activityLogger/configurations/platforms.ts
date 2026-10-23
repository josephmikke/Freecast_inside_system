import {
  checkEntity, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { PlatformPayload, PlatformResult } from '@entities/configurations/platform';

export default function platformsActivityLogger(
  platformsBase: PlatformResult,
  platformsPayload: PlatformPayload,
) {
  const updatedFields = checkEntity(platformsBase, platformsPayload, {
    name: checkSimpleValue,
    extId: checkSimpleValue,
  });

  console.log(updatedFields);
}
