import { MovieRating } from '../../../asset/shared/Rating';
import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto } from '../../../shared/dto/RecordingDto';
import RecordingFactory from '../../shared/RecordingFactory';
import RecordingRepository from '../../shared/RecordingRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetRecordingsDomain from '../GetRecordingsDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-getUserRecordings');
mockJestTimers();

const epgProgram: EPGProgram = {
  id: new UIDGenerator().generate(8),
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
const recordingDto: RecordingDto = {
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

describe('ApiGatewayAdaptor', () => {
  describe('Success', () => {
    it('should return all recordings given an existing username', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const recordingRepository = new RecordingRepository(
        ddbClient,
        TEST_TABLE_NAME,
        recordingFactory,
      );
      const domain = new GetRecordingsDomain(recordingRepository, recordingFactory);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const event = {
        ...eventMock,
        pathParameters: {
          username: 'johndoe',
        },
      };
      const johnDoeRecordings = await Promise.all(Array.from(Array(3).keys()).map(async (key) => {
        const recording = await recordingFactory.toDomain({ ...recordingDto, id: key.toString() });
        await recordingRepository.save(recording);
        return {
          ...recordingFactory.toPersistence(recording),
          destination: {
            hls: `${process.env.ASSETS_URL}/${recording.destination.hls.value()}`,
            dash: `${process.env.ASSETS_URL}/${recording.destination.dash.value()}`,
          },
        };
      }));
      const otherRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: new UIDGenerator().generate(8),
        username: 'nathan',
      });
      await recordingRepository.save(otherRecording);

      // Act
      const result = await apiGatewayAdaptor.handler(event);

      // Assert
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({
        recordings: johnDoeRecordings,
      });
      expect(JSON.parse(result.body).recordings).toHaveLength(3);
    });

    it('should return an empty array', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const recordingRepository = new RecordingRepository(
        ddbClient,
        TEST_TABLE_NAME,
        recordingFactory,
      );
      const domain = new GetRecordingsDomain(recordingRepository, recordingFactory);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const event = {
        ...eventMock,
        pathParameters: {
          username: 'nathan',
        },
      };
      const recording = await recordingFactory.toDomain(recordingDto);
      await recordingRepository.save(recording);

      // Act
      const result = await apiGatewayAdaptor.handler(event);

      // Assert
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({
        recordings: [],
      });
      expect(JSON.parse(result.body).recordings).toHaveLength(0);
    });
  });

  // TODO: error path
});
