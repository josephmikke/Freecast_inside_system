import { EPGQueryParameters } from '../../shared/dto/EPGDto';

import { EPGValidationResult } from './ValidateEPGDomain';

export interface IValidateEPGDomain {
  validateEPG(id: string, filter?: EPGQueryParameters): Promise<EPGValidationResult>;
} 