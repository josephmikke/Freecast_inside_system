import {
  checkArray,
  checkEntity, checkPayloadIsDefined, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { PackagePayload, PackageResult } from '@entities/configurations/package';

export default function packagesActivityLogger(
  packagesBase: PackageResult,
  packagesPayload: PackagePayload,
) {
  const updatedFields = checkEntity(packagesBase, packagesPayload, {
    name: checkSimpleValue,
    extId: checkSimpleValue,
    description: checkSimpleValue,
    default: checkSimpleValue,
    revenueModel: checkSimpleValue,
    type: checkSimpleValue,
    platforms: checkArray,
    price: checkSimpleValue,
    thumbnail: checkPayloadIsDefined,
  });

  console.log(updatedFields);
}
