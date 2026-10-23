import { EPGProgram } from '../shared/IParser';

import ValidateEPGDomain, { EPGValidationResult } from './ValidateEPGDomain';

describe('ValidateEPGDomain', () => {
  let validateEPGDomain: ValidateEPGDomain;

  beforeEach(() => {
    validateEPGDomain = new ValidateEPGDomain({} as any);
  });

  describe('validateEPGPrograms', () => {
    it('should return valid result for properly sorted and continuous programs', () => {
      const programs: EPGProgram[] = [
        {
          id: '1',
          title: 'Program 1',
          subtitle: null,
          slug: 'program-1',
          description: 'Description 1',
          start_time: '2025-07-24T18:00:00Z',
          end_time: '2025-07-24T19:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
        {
          id: '2',
          title: 'Program 2',
          subtitle: null,
          slug: 'program-2',
          description: 'Description 2',
          start_time: '2025-07-24T19:00:00Z',
          end_time: '2025-07-24T20:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-2',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.totalPrograms).toBe(2);
      expect(result.sortedPrograms).toHaveLength(2);
      expect(result.timeGaps).toHaveLength(0);
      expect(result.timeOverlaps).toHaveLength(0);
    });

    it('should detect time overlaps', () => {
      const programs: EPGProgram[] = [
        {
          id: '1',
          title: 'Program 1',
          subtitle: null,
          slug: 'program-1',
          description: 'Description 1',
          start_time: '2025-07-24T18:00:00Z',
          end_time: '2025-07-24T19:30:00Z',
          duration: '5400',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
        {
          id: '2',
          title: 'Program 2',
          subtitle: null,
          slug: 'program-2',
          description: 'Description 2',
          start_time: '2025-07-24T19:00:00Z',
          end_time: '2025-07-24T20:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-2',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Time overlap detected');
      expect(result.timeOverlaps).toHaveLength(1);
      expect(result.timeOverlaps[0].overlapMinutes).toBe(30);
    });

    it('should detect time gaps', () => {
      const programs: EPGProgram[] = [
        {
          id: '1',
          title: 'Program 1',
          subtitle: null,
          slug: 'program-1',
          description: 'Description 1',
          start_time: '2025-07-24T18:00:00Z',
          end_time: '2025-07-24T19:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
        {
          id: '2',
          title: 'Program 2',
          subtitle: null,
          slug: 'program-2',
          description: 'Description 2',
          start_time: '2025-07-24T19:30:00Z',
          end_time: '2025-07-24T20:00:00Z',
          duration: '1800',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-2',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      // Gaps are reported as warnings, but any warning also makes the EPG invalid
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Time gap detected');
      expect(result.timeGaps).toHaveLength(1);
      expect(result.timeGaps[0].gapMinutes).toBe(30);
    });

    it('should sort programs by start time', () => {
      const programs: EPGProgram[] = [
        {
          id: '2',
          title: 'Program 2',
          subtitle: null,
          slug: 'program-2',
          description: 'Description 2',
          start_time: '2025-07-24T19:00:00Z',
          end_time: '2025-07-24T20:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-2',
          catchup: false,
          rating: null,
          archive: false,
        },
        {
          id: '1',
          title: 'Program 1',
          subtitle: null,
          slug: 'program-1',
          description: 'Description 1',
          start_time: '2025-07-24T18:00:00Z',
          end_time: '2025-07-24T19:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.sortedPrograms[0].id).toBe('1');
      expect(result.sortedPrograms[1].id).toBe('2');
    });

    it('should detect invalid program duration', () => {
      const programs: EPGProgram[] = [
        {
          id: '1',
          title: 'Invalid Program',
          subtitle: null,
          slug: 'invalid-program',
          description: 'Description 1',
          start_time: '2025-07-24T19:00:00Z',
          end_time: '2025-07-24T18:00:00Z', // End time before start time
          duration: '-3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid program duration');
    });

    it('should detect missing title', () => {
      const programs: EPGProgram[] = [
        {
          id: '1',
          title: '', // Empty title
          subtitle: null,
          slug: 'program-1',
          description: 'Description 1',
          start_time: '2025-07-24T18:00:00Z',
          end_time: '2025-07-24T19:00:00Z',
          duration: '3600',
          thumbnail: null,
          alternateThumbnail: null,
          ext_id: 'ext-1',
          catchup: false,
          rating: null,
          archive: false,
        },
      ];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Program missing title');
    });

    it('should handle empty programs array', () => {
      const programs: EPGProgram[] = [];

      const result = (validateEPGDomain as any).validateEPGPrograms(programs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('No programs found in EPG');
      expect(result.totalPrograms).toBe(0);
    });
  });
}); 