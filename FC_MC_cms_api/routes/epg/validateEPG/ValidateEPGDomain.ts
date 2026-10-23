import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram } from '../shared/IParser';

import { IValidateEPGDomain } from './IValidateEPGDomain';

export interface EPGValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalPrograms: number;
  sortedPrograms: EPGProgram[];
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

export default class ValidateEPGDomain implements IValidateEPGDomain {
  constructor(private readonly epgRepository: IEPGRepository) {}

  async validateEPG(id: string, filter?: EPGQueryParameters): Promise<EPGValidationResult> {
    const epg = await this.epgRepository.findOne(id, {
      filter: filter || {},
      ignore: false,
    });
    
    if (!epg) {
      throw new EPGError.EPGNotFound();
    }

    return this.validateEPGPrograms(epg.programs);
  }

  private validateEPGPrograms(programs: EPGProgram[]): EPGValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const timeGaps: Array<{
      previousProgram: EPGProgram;
      nextProgram: EPGProgram;
      gapMinutes: number;
    }> = [];
    const timeOverlaps: Array<{
      previousProgram: EPGProgram;
      nextProgram: EPGProgram;
      overlapMinutes: number;
    }> = [];

    if (programs.length === 0) {
      errors.push('No programs found in EPG');
      return {
        isValid: false,
        errors,
        warnings,
        totalPrograms: 0,
        sortedPrograms: [],
        timeGaps,
        timeOverlaps,
      };
    }

    // Sort programs by start_time
    const sortedPrograms = [...programs].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Check for time continuity
    for (let i = 0; i < sortedPrograms.length - 1; i++) {
      const currentProgram = sortedPrograms[i];
      const nextProgram = sortedPrograms[i + 1];

      const currentEndTime = new Date(currentProgram.end_time);
      const nextStartTime = new Date(nextProgram.start_time);

      if (currentEndTime > nextStartTime) {
        // Overlap detected
        const overlapMs = currentEndTime.getTime() - nextStartTime.getTime();
        const overlapMinutes = Math.round(overlapMs / (1000 * 60));
        
        timeOverlaps.push({
          previousProgram: currentProgram,
          nextProgram: nextProgram,
          overlapMinutes,
        });

        errors.push(
          `Time overlap detected: "${currentProgram.title}" (ends ${currentProgram.end_time}) overlaps with "${nextProgram.title}" (starts ${nextProgram.start_time}) by ${overlapMinutes} minutes`
        );
      } else if (currentEndTime < nextStartTime) {
        // Gap detected
        const gapMs = nextStartTime.getTime() - currentEndTime.getTime();
        const gapMinutes = Math.round(gapMs / (1000 * 60));
        
        timeGaps.push({
          previousProgram: currentProgram,
          nextProgram: nextProgram,
          gapMinutes,
        });

        warnings.push(
          `Time gap detected: "${currentProgram.title}" (ends ${currentProgram.end_time}) has ${gapMinutes} minute gap before "${nextProgram.title}" (starts ${nextProgram.start_time})`
        );
      }
    }

    // Additional validations
    for (const program of sortedPrograms) {
      const startTime = new Date(program.start_time);
      const endTime = new Date(program.end_time);

      if (startTime >= endTime) {
        errors.push(
          `Invalid program duration: "${program.title}" has start time (${program.start_time}) >= end time (${program.end_time})`
        );
      }

      if (!program.title || program.title.trim() === '') {
        errors.push(`Program missing title at ${program.start_time}`);
      }
    }

    const isValid = errors.length === 0 && warnings.length === 0;

    return {
      isValid,
      errors,
      warnings,
      totalPrograms: sortedPrograms.length,
      sortedPrograms,
      timeGaps,
      timeOverlaps,
    };
  }
} 