import { MovieRating } from '../../../asset/shared/Rating';
import { initDatabase } from '../../../../utils/jest-utils';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto } from '../../../shared/dto/RecordingDto';
import RecordingFactory from '../../shared/RecordingFactory';
import RecordingRepository from '../../shared/RecordingRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteRecordingsDomain from '../DeleteRecordingsDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-deleteRecordings');

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

describe('API Gateway Adaptor - Delete recordings', () => {
  describe('Success', () => {
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const domain = new DeleteRecordingsDomain(repository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should bulk delete recordings', async () => {
      // Arrange
      const firstRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '1',
        username: 'nathan',
      });
      const secondRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '2', // new UIDGenerator().generate(8),
        username: 'nathan',
      });
      const thirdRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '4', // new UIDGenerator().generate(8),
        username: 'another-user',
      });
      await repository.save(firstRecording);
      await repository.save(secondRecording);
      await repository.save(thirdRecording);
      const event = {
        ...eventMock,
        pathParameters: {
          username: 'nathan',
        },
        body: {
          ids: ['2', '1', '3', '4'],
        },
      };

      // Act
      const beforeDeletion = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#1`,
          ':SK': `${RecordingRepository.RootEntityType}#`,
        },
      });
      const result = await apiGatewayAdaptor.handler(event);
      const afterDeletion = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#1`,
          ':SK': `${RecordingRepository.RootEntityType}#`,
        },
      });
      const shouldBeEmpty = await repository.findAllByUserId('nathan');
      const shouldContainsOneItem = await repository.findAllByUserId('another-user');

      // Assert
      expect(shouldBeEmpty).toHaveLength(0);
      expect(beforeDeletion.Items).toHaveLength(2); // It contains the user entry
      expect(afterDeletion.Items).toHaveLength(1);
      expect(shouldContainsOneItem).toHaveLength(1);
      expect(result.statusCode).toEqual(207);
      expect(JSON.parse(result.body)).toEqual({
        responses: [
          {
            id: '2',
            statusCode: 204,
          },
          {
            id: '1',
            statusCode: 204,
          },
          {
            id: '3',
            statusCode: 404,
          },
          {
            id: '4',
            statusCode: 404,
          },
        ],
      });
    });

    it('should return an empty array', async () => {
      // Arrange
      const firstRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '1',
        username: 'nathan',
      });
      const secondRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '2', // new UIDGenerator().generate(8),
        username: 'nathan',
      });
      await repository.save(firstRecording);
      await repository.save(secondRecording);
      const event = {
        ...eventMock,
        pathParameters: {
          username: 'nathan',
        },
        body: {
          ids: [],
        },
      };

      // Act
      const result = await apiGatewayAdaptor.handler(event);
      const shouldContainsTwoItems = await repository.findAllByUserId('nathan');

      // Assert
      expect(shouldContainsTwoItems).toHaveLength(2);
      expect(result.statusCode).toEqual(207);
      expect(JSON.parse(result.body)).toEqual({
        responses: [],
      });
    });
  });

  describe('Error', () => {
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, 'non-existing-table', recordingFactory);
    const domain = new DeleteRecordingsDomain(repository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should throw an error 500', async () => {
      // Arrange
      const event = {
        ...eventMock,
        pathParameters: {
          username: 'nathan',
        },
        body: {
          ids: ['2', '1', '3', '4'],
        },
      };

      // Act
      const result = await apiGatewayAdaptor.handler(event);

      // Assert
      expect(result.statusCode).toEqual(500);
    });
  });
});
