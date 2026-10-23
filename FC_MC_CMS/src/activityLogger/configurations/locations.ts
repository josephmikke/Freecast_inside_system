import {
  checkArray,
  checkEntity, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { LocationPayload, LocationResult } from '@entities/configurations/location';

export default function locationActivityLogger(
  locationBase: LocationResult,
  locationPayload: LocationPayload,
) {
  const updatedFields = checkEntity(locationBase, locationPayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    type: checkSimpleValue,
    packages: checkArray,
    cities: checkArray,
    countries: checkArray,
    states: checkArray,
    zipCodes: checkArray,
  });

  console.log(updatedFields);
}
