import {
  checkEntity, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { GenrePayload, GenreResult } from '@entities/configurations/genre';

export default function genresActivityLogger(
  genresBase: GenreResult,
  genresPayload: GenrePayload,
) {
  const updatedFields = checkEntity(genresBase, genresPayload, {
    name: checkSimpleValue,
    extId: checkSimpleValue,
  });

  console.log(updatedFields);
}
