import { mockJestTimers } from '../../../../utils/jest-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto, RecordingStatus } from '../../../shared/dto/RecordingDto';
import DashDestination, { DashDestinationError } from '../../../shared/valueObjects/DashDestination';
import HlsDestination, { HlsDestinationError } from '../../../shared/valueObjects/HlsDestination';
import RecordingFactory from '../RecordingFactory';

mockJestTimers();

describe('Recording Factory', () => {
  describe('toDomain', () => {
    describe('success', () => {
      it('it should create a Recording instance', async () => {
        // Arrange
        const epgProgram: EPGProgram = {
          id: 'random-id',
          title: 'Yahoo! Finance Live',
          ext_id: '202639449', // should be unique
          duration: '3600',
          start_time: '2022-11-30T10:01:00Z',
          end_time: '2022-11-30T10:00:00Z',
          thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
          alternateThumbnail: null,
          archive: false,
          rating: MovieRating.R,
          description: 'Live market coverage and analysis.',
          catchup: true,
          slug: 'sc-202639449',
          subtitle: 'Test subtitle',
        };
        const recordingProps: RecordingDto = {
          id: epgProgram.id,
          program: epgProgram,
          channel: 'channelId',
          extId: 'vubiquity_Value_Reelz', // This is the MediaPackage channel identifier
          username: 'johndoe',
          destination: {
            hls: 'npvr/channelId/programId/hls/index.m3u8',
            dash: 'npvr/channelId/programId/dash/index.mpd',
          },
        };
        const recordingFactory = new RecordingFactory();

        // Act
        const recording = await recordingFactory.toDomain(recordingProps);

        // Assert
        expect(recording.id).toEqual(epgProgram.id);
        expect(recording.status).toEqual(RecordingStatus.PENDING);
        expect(recording.hlsStatus).toEqual(RecordingStatus.PENDING);
        expect(recording.dashStatus).toEqual(RecordingStatus.PENDING);
        expect(recording.username).toEqual(recordingProps.username);
        expect(recording.extId).toEqual(recordingProps.extId);
        expect(recording.channel).toEqual(recordingProps.channel);
        expect(recording.program).toEqual(recordingProps.program);
        expect(recording.destination.hls).toBeInstanceOf(HlsDestination);
        expect(recording.destination.dash).toBeInstanceOf(DashDestination);
      });
    });

    describe('error', () => {
      it('should throw HlsDestinationError.InvalidManifestKey', async () => {
      // Arrange
        const epgProgram: EPGProgram = {
          id: 'random-id',
          title: 'Yahoo! Finance Live',
          ext_id: '202639449', // should be unique
          duration: '3600',
          start_time: '2022-11-30T10:01:00Z',
          end_time: '2022-11-30T10:00:00Z',
          thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
          alternateThumbnail: null,
          archive: false,
          rating: MovieRating.NOT_RATED,
          description: 'Live market coverage and analysis.',
          catchup: true,
          slug: 'sc-202639449',
          subtitle: 'Test subtitle',
        };
        const recordingProps: RecordingDto = {
          id: epgProgram.id,
          program: epgProgram,
          channel: 'channelId',
          extId: 'vubiquity_Value_Reelz', // This is the MediaPackage channel identifier
          username: 'johndoe',
          destination: {
            hls: 'npvr/channelId/programId/hls/index.mpd', // Invalid extension
            dash: 'npvr/channelId/programId/dash/index.mpd',
          },
        };
        const recordingFactory = new RecordingFactory();

        // Act & Assert
        await expect(async () => recordingFactory.toDomain(recordingProps))
          .rejects.toThrow(HlsDestinationError.InvalidManifestKey);
      });

      it('should throw DashDestinationError.InvalidManifestKey', async () => {
        // Arrange
        const epgProgram: EPGProgram = {
          id: 'random-id',
          title: 'Yahoo! Finance Live',
          ext_id: '202639449', // should be unique
          duration: '3600',
          start_time: '2022-11-30T10:01:00Z',
          end_time: '2022-11-30T10:00:00Z',
          thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
          alternateThumbnail: null,
          archive: false,
          rating: MovieRating.PG_13,
          description: 'Live market coverage and analysis.',
          catchup: true,
          slug: 'sc-202639449',
          subtitle: 'Test subtitle',
        };
        const recordingProps: RecordingDto = {
          id: epgProgram.id,
          program: epgProgram,
          channel: 'channelId',
          extId: 'vubiquity_Value_Reelz', // This is the MediaPackage channel identifier
          username: 'johndoe',
          destination: {
            hls: 'npvr/channelId/programId/hls/index.m3u8',
            dash: 'npvr/channelId/programId/hls/index.mpd', // Invalid path
          },
        };
        const recordingFactory = new RecordingFactory();

        // Act & Assert
        await expect(async () => recordingFactory.toDomain(recordingProps))
          .rejects.toThrow(DashDestinationError.InvalidManifestKey);
      });
    });
  });

  it('toPersistence', async () => {
    // Arrange
    const epgProgram: EPGProgram = {
      id: 'random-id',
      title: 'Yahoo! Finance Live',
      ext_id: '202639449', // should be unique
      duration: '3600',
      start_time: '2022-11-30T10:01:00Z',
      end_time: '2022-11-30T10:00:00Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.G,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    };
    const recordingProps: RecordingDto = {
      id: epgProgram.id,
      program: epgProgram,
      channel: 'channelId',
      extId: 'vubiquity_Value_Reelz', // This is the MediaPackage channel identifier
      username: 'johndoe',
      destination: {
        hls: 'npvr/channelId/programId/hls/index.m3u8',
        dash: 'npvr/channelId/programId/dash/index.mpd',
      },
    };
    const recordingFactory = new RecordingFactory();
    const recording = await recordingFactory.toDomain(recordingProps);

    // Act
    const rawRecording = await recordingFactory.toPersistence(recording);

    // Assert
    expect(rawRecording).toEqual({
      id: epgProgram.id,
      channel: 'channelId',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      extId: 'vubiquity_Value_Reelz',
      status: RecordingStatus.PENDING,
      dashStatus: RecordingStatus.PENDING,
      hlsStatus: RecordingStatus.PENDING,
      program: recordingProps.program,
      username: 'johndoe',
      destination: {
        hls: 'npvr/channelId/programId/hls/index.m3u8',
        dash: 'npvr/channelId/programId/dash/index.mpd',
      },
      failureReason: '',
    });
  });
});
