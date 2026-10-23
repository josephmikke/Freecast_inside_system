import {
  checkEntity, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { CategoryPayload, CategoryResult } from '@entities/configurations/category';

export default function categoryActivityLogger(
  categoryBase: CategoryResult,
  categoryPayload: CategoryPayload,
) {
  const updatedFields = checkEntity(categoryBase, categoryPayload, {
    name: checkSimpleValue,
    extId: checkSimpleValue,
  });

  console.log(updatedFields);
}
