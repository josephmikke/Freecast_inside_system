import { CommonEntityPayload, CommonEntityResult } from '@entities/common';

interface CategoryResult extends CommonEntityResult {
  weight?: number;
}
interface CategoryPayload extends CommonEntityPayload {
  weight?: number;
}

export type { CategoryResult, CategoryPayload };
