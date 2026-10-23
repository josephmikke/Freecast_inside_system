import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import { EPGProgram } from '../shared/IParser';

export interface EPGValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalPrograms: number;
  timeGaps: Array<{
    previousProgram: EPGProgram;
    nextProgram: EPGProgram;
    gapMinutes: number;
  }>;
  timeOverlaps: Array<{
    previousProgram: EPGProgram;
    nextProgram: EPGProgram;
    overlapMinutes: number;
  }>;
}

export interface IValidateAllEPGsDomain {
  validateAllEPGs(filter?: EPGQueryParameters, autoRepair?: boolean): Promise<{
    totalEPGs: number;
    validEPGs: number;
    invalidEPGs: number;
    repairedEPGs: number;
    results: Array<{
      epgId: string;
      epgName: string;
      validation: EPGValidationResult;
      wasRepaired?: boolean;
      repairError?: string;
    }>;
    summary: {
      totalPrograms: number;
      totalErrors: number;
      totalWarnings: number;
      totalTimeGaps: number;
      totalTimeOverlaps: number;
    };
    /**
     * The time range the EPGs were validated against — either the requested
     * `startTime`/`endTime`, or the past 12 hours through the next 12 hours by default.
     */
    timeRange: {
      startTime: string;
      endTime: string;
    };
  }>;
}
