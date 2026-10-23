import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import { EpgTemplateType } from '../../shared/dto/EPGTemplateDto';
import { IRepairEPGDomain } from '../repairEPG/IRepairEPGDomain';
import EPG from '../shared/EPG';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram, GenericObject, IParser } from '../shared/IParser';

import { IValidateAllEPGsDomain, EPGValidationResult } from './IValidateAllEPGsDomain';

interface Parser {
  csv: IParser<GenericObject, EPGProgram>;
  json: IParser<GenericObject, EPGProgram>;
  xml: IParser<GenericObject, EPGProgram>;
}

interface TimeRange {
  startTime: Date;
  endTime: Date;
}

// When no explicit range is requested, validate the programs surrounding "now".
const DEFAULT_WINDOW_HOURS = 12;
const HOUR_IN_MS = 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;
// How much of the validated range may be left uncovered before it is reported as missing data.
const COVERAGE_TOLERANCE_MS = 60 * MINUTE_IN_MS;

export default class ValidateAllEPGsDomain implements IValidateAllEPGsDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly parser?: Parser,
    private readonly repairDomain?: IRepairEPGDomain,
    private readonly enabledChannelEpgIdsProvider?: () => Promise<Set<string>>,
  ) {}

  async validateAllEPGs(filter?: EPGQueryParameters, autoRepair?: boolean): Promise<{
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
    timeRange: {
      startTime: string;
      endTime: string;
    };
  }> {
    const timeRange = ValidateAllEPGsDomain.resolveTimeRange(filter);
    const resolvedFilter: Required<EPGQueryParameters> = {
      startTime: timeRange.startTime.toISOString(),
      endTime: timeRange.endTime.toISOString(),
    };

    let epgs = await this.epgRepository.findAll({
      filter: resolvedFilter,
      ignore: false,
    });

    if (this.enabledChannelEpgIdsProvider) {
      const enabledChannelEpgIds = await this.enabledChannelEpgIdsProvider();
      epgs = epgs.filter((epg) => enabledChannelEpgIds.has(epg.id));
    }

    if (epgs.length === 0) {
      return {
        totalEPGs: 0,
        validEPGs: 0,
        invalidEPGs: 0,
        repairedEPGs: 0,
        results: [],
        summary: {
          totalPrograms: 0,
          totalErrors: 0,
          totalWarnings: 0,
          totalTimeGaps: 0,
          totalTimeOverlaps: 0,
        },
        timeRange: resolvedFilter,
      };
    }

    const results = await Promise.all(
      epgs.map(async (epg) => {
        // Validate programs from database
        const validation = this.validateEPGPrograms(epg.programs, timeRange);

        // Check source URL for recent data if parser is available
        if (this.parser && epg.ingestionUrl) {
          const sourceValidation = await this.validateSourceUrl(epg, timeRange);
          // Merge source validation warnings/errors into main validation
          validation.warnings.push(...sourceValidation.warnings);
          validation.errors.push(...sourceValidation.errors);
          // Update isValid if source validation found issues
          if (!sourceValidation.isValid && validation.isValid) {
            validation.isValid = false;
          }
          if (!sourceValidation.isValid) {
            return {
              epgId: epg.id,
              epgName: epg.name,
              validation,
              wasRepaired: false,
              repairError: 'Source URL is empty or not returning recent data',
            };
          }
        }
        let wasRepaired = false;
        let repairError: string | undefined;

        // Attempt repair if autoRepair is enabled, repair domain is available, and EPG is invalid
        if (autoRepair && this.repairDomain && !validation.isValid) {
          try {
            await this.repairDomain.repairEPG(epg.id);
            wasRepaired = true;
          } catch (error) {
            repairError = error instanceof Error ? error.message : 'Repair failed';
          }
        }

        return {
          epgId: epg.id,
          epgName: epg.name,
          validation,
          wasRepaired,
          repairError,
        };
      }),
    );

    const validEPGs = results.filter((r) => r.validation.isValid).length;
    const invalidEPGs = results.filter((r) => !r.validation.isValid).length;
    const repairedEPGs = results.filter((r) => r.wasRepaired).length;

    const summary = {
      totalPrograms: results.reduce((sum, r) => sum + r.validation.totalPrograms, 0),
      totalErrors: results.reduce((sum, r) => sum + r.validation.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.validation.warnings.length, 0),
      totalTimeGaps: results.reduce((sum, r) => sum + r.validation.timeGaps.length, 0),
      totalTimeOverlaps: results.reduce((sum, r) => sum + r.validation.timeOverlaps.length, 0),
    };

    return {
      totalEPGs: epgs.length,
      validEPGs,
      invalidEPGs,
      repairedEPGs,
      results,
      summary,
      timeRange: resolvedFilter,
    };
  }

  /**
   * Resolves the time range the validation should run against. When the caller does not
   * provide a usable `startTime`/`endTime`, it defaults to the past 12 hours through the
   * next 12 hours relative to now.
   */
  private static resolveTimeRange(filter?: EPGQueryParameters): TimeRange {
    const now = Date.now();
    const defaultRange: TimeRange = {
      startTime: new Date(now - DEFAULT_WINDOW_HOURS * HOUR_IN_MS),
      endTime: new Date(now + DEFAULT_WINDOW_HOURS * HOUR_IN_MS),
    };

    const startTime = ValidateAllEPGsDomain.parseDate(filter?.startTime) ?? defaultRange.startTime;
    const endTime = ValidateAllEPGsDomain.parseDate(filter?.endTime) ?? defaultRange.endTime;

    // An inverted or empty range would filter out every program, so fall back to the default.
    if (startTime.getTime() >= endTime.getTime()) {
      return defaultRange;
    }

    return { startTime, endTime };
  }

  private static parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  /**
   * Measures how much of the validated time range the given programs actually cover. A
   * non-zero `missingAtEndMs` means the EPG has not been fed with new programs for the
   * upcoming part of the range.
   */
  private static measureCoverage(programs: EPGProgram[], timeRange: TimeRange): {
    firstStartMs: number;
    lastEndMs: number;
    missingAtStartMs: number;
    missingAtEndMs: number;
    longestProgramMs: number;
  } {
    let firstStartMs = Number.POSITIVE_INFINITY;
    let lastEndMs = Number.NEGATIVE_INFINITY;
    let longestProgramMs = 0;

    programs.forEach((program) => {
      const startMs = new Date(program.start_time).getTime();
      const endMs = new Date(program.end_time).getTime();

      if (!Number.isNaN(startMs) && startMs < firstStartMs) {
        firstStartMs = startMs;
      }
      if (!Number.isNaN(endMs) && endMs > lastEndMs) {
        lastEndMs = endMs;
      }
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs - startMs > longestProgramMs) {
        longestProgramMs = endMs - startMs;
      }
    });

    return {
      firstStartMs,
      lastEndMs,
      missingAtStartMs: firstStartMs - timeRange.startTime.getTime(),
      missingAtEndMs: timeRange.endTime.getTime() - lastEndMs,
      longestProgramMs,
    };
  }

  private validateEPGPrograms(
    programs: EPGProgram[],
    timeRange: TimeRange,
  ): EPGValidationResult {
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
      errors.push(
        'No programs found in EPG for the validated time range '
        + `(${timeRange.startTime.toISOString()} - ${timeRange.endTime.toISOString()})`,
      );
      return {
        isValid: false,
        errors,
        warnings,
        totalPrograms: 0,
        timeGaps,
        timeOverlaps,
      };
    }

    // Sort programs by start_time
    const sortedPrograms = [...programs].sort((a, b) => new Date(a.start_time).getTime()
      - new Date(b.start_time).getTime());

    // Check for time continuity
    for (let i = 0; i < sortedPrograms.length - 1; i += 1) {
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
          nextProgram,
          overlapMinutes,
        });

        errors.push(
          `Time overlap detected: "${currentProgram.title}" (ends ${currentProgram.end_time}) 
          overlaps with "${nextProgram.title}" (starts ${nextProgram.start_time}) by ${overlapMinutes} minutes`,
        );
      } else if (currentEndTime < nextStartTime) {
        // Gap detected
        const gapMs = nextStartTime.getTime() - currentEndTime.getTime();
        const gapMinutes = Math.round(gapMs / (1000 * 60));
        timeGaps.push({
          previousProgram: currentProgram,
          nextProgram,
          gapMinutes,
        });

        warnings.push(
          `Time gap detected: "${currentProgram.title}" (ends ${currentProgram.end_time}) has ${gapMinutes} 
          minute gap before "${nextProgram.title}" (starts ${nextProgram.start_time})`,
        );
      }
    }

    sortedPrograms.forEach((program) => {
      const startTime = new Date(program.start_time);
      const endTime = new Date(program.end_time);

      if (startTime >= endTime) {
        errors.push(
          `Invalid program duration: "${program.title}" has 
          start time (${program.start_time}) >= end time (${program.end_time})`,
        );
      }

      if (!program.title || program.title.trim() === '') {
        errors.push(`Program missing title at ${program.start_time}`);
      }
    });

    // The repository only returns the programs fully contained in the range, so the programs
    // airing across either boundary are missing from the result. Tolerate an uncovered slice
    // as long as the longest program of the range before reporting it as missing data.
    const coverage = ValidateAllEPGsDomain.measureCoverage(sortedPrograms, timeRange);
    const tolerance = Math.max(coverage.longestProgramMs, COVERAGE_TOLERANCE_MS);
    const hasUsableTimes = Number.isFinite(coverage.firstStartMs)
      && Number.isFinite(coverage.lastEndMs);

    if (hasUsableTimes && coverage.missingAtStartMs > tolerance) {
      warnings.push(
        'Missing EPG data at the beginning of the validated time range: no programs between '
        + `${timeRange.startTime.toISOString()} and ${new Date(coverage.firstStartMs).toISOString()} `
        + `(${Math.round(coverage.missingAtStartMs / MINUTE_IN_MS)} minutes)`,
      );
    }

    if (hasUsableTimes && coverage.missingAtEndMs > tolerance) {
      errors.push(
        'No upcoming programs found in EPG: program data ends on '
        + `${new Date(coverage.lastEndMs).toISOString()}, `
        + `${Math.round(coverage.missingAtEndMs / MINUTE_IN_MS)} minutes before the end of the `
        + `validated time range (${timeRange.endTime.toISOString()})`,
      );
    }

    const isValid = errors.length === 0 && warnings.length === 0;

    return {
      isValid,
      errors,
      warnings,
      totalPrograms: sortedPrograms.length,
      timeGaps,
      timeOverlaps,
    };
  }

  private async validateSourceUrl(epg: EPG, timeRange: TimeRange): Promise<EPGValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Fetch and parse EPG from source URL
      const sourcePrograms = await this.fetchSourcePrograms(epg);

      if (sourcePrograms.length === 0) {
        errors.push(`Source URL (${epg.ingestionUrl}) returned no programs`);
        return {
          isValid: false,
          errors,
          warnings,
          totalPrograms: 0,
          timeGaps: [],
          timeOverlaps: [],
        };
      }

      // Keep the programs overlapping the validated time range — unlike the repository, the
      // source returns every program, so the ones airing across a boundary are kept as well.
      const programsInRange = sourcePrograms.filter((program) => {
        const programStartTime = new Date(program.start_time);
        const programEndTime = new Date(program.end_time);
        return programEndTime > timeRange.startTime && programStartTime < timeRange.endTime;
      });

      const sourceCoverage = ValidateAllEPGsDomain.measureCoverage(sourcePrograms, timeRange);
      const latestEndTime = Number.isFinite(sourceCoverage.lastEndMs)
        ? new Date(sourceCoverage.lastEndMs).toISOString()
        : 'unknown';

      if (programsInRange.length === 0) {
        errors.push(
          `Source URL (${epg.ingestionUrl}) has no data for the validated time range `
          + `(${timeRange.startTime.toISOString()} - ${timeRange.endTime.toISOString()}). `
          + `Latest EPG program ends on ${latestEndTime}`,
        );
      } else if (sourceCoverage.missingAtEndMs > COVERAGE_TOLERANCE_MS) {
        errors.push(
          `Source URL (${epg.ingestionUrl}) has no upcoming programs: data ends on `
          + `${latestEndTime}, `
          + `${Math.round(sourceCoverage.missingAtEndMs / MINUTE_IN_MS)} minutes before the end `
          + `of the validated time range (${timeRange.endTime.toISOString()})`,
        );
      }

      return {
        isValid: warnings.length === 0 && errors.length === 0,
        errors,
        warnings,
        totalPrograms: programsInRange.length,
        timeGaps: [],
        timeOverlaps: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(
        `Failed to fetch EPG data from source URL (${epg.ingestionUrl}): ${errorMessage || 'Unknown error'}`,
      );
      return {
        isValid: false,
        errors,
        warnings,
        totalPrograms: 0,
        timeGaps: [],
        timeOverlaps: [],
      };
    }
  }

  private async fetchSourcePrograms(epg: EPG): Promise<EPGProgram[]> {
    if (!this.parser) {
      throw new EPGError.UnknownEPGDependency();
    }

    let rawEPG: GenericObject;
    const { epgTemplate } = epg;

    switch (epgTemplate.templateType) {
      case EpgTemplateType.JSON:
        rawEPG = await this.parser.json.fetch(epg.ingestionUrl);
        return this.parser.json.parse(rawEPG, epgTemplate.mapping);

      case EpgTemplateType.CSV:
        rawEPG = await this.parser.csv.fetch(epg.ingestionUrl);
        return this.parser.csv.parse(rawEPG, epgTemplate.mapping);

      case EpgTemplateType.XML:
        rawEPG = await this.parser.xml.fetch(epg.ingestionUrl);
        return this.parser.xml.parse(rawEPG, epgTemplate.mapping);

      default:
        throw new EPGError.UnknownEPGDependency();
    }
  }
}
