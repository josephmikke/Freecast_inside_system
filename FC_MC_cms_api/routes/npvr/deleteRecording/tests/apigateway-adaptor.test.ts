import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import { initDatabase } from '../../../../utils/jest-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto } from '../../../shared/dto/RecordingDto';
import StorageAdaptor from '../../../shared/StorageAdaptor';
import RecordingFactory from '../../shared/RecordingFactory';
import RecordingRepository from '../../shared/RecordingRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import SystemDeleteRecordingsDomain from '../SystemDeleteRecordingsDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-systemDeleteRecordings');
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
    const s3Mock = mockClient(S3Client);
    const storageAdaptor = new StorageAdaptor(new S3Client({}), '', new UIDGenerator());
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const domain = new SystemDeleteRecordingsDomain(repository, storageAdaptor);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    beforeEach(() => {
      s3Mock.reset();
    });

    it('should delete recording', async () => {
      // Arrange
      s3Mock.onAnyCommand().resolves({});
      const firstRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '1',
        username: 'nathan',
      });
      const secondRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '2', // new UIDGenerator().generate(8),
        username: 'jhondoe',
      });
      await repository.save(firstRecording);
      await repository.save(secondRecording);
      const event = {
        ...eventMock,
        pathParameters: {
          id: '1',
        },
      };

      // Act
      const result = await apiGatewayAdaptor.handler(event);
      const firstRecordingItems = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#1`,
          ':SK': `${RecordingRepository.RootEntityType}#`,
        },
      });
      const secondRecordingItems = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#2`,
          ':SK': `${RecordingRepository.RootEntityType}#`,
        },
      });

      // Assert
      expect(firstRecordingItems.Items).toHaveLength(0);
      expect(secondRecordingItems.Items).toHaveLength(2);
      expect(result.statusCode).toEqual(204);
    });

    it('should throw Recording Not Found Exception', async () => {
      // Arrange
      s3Mock.onAnyCommand().resolves({});
      const event = {
        ...eventMock,
        pathParameters: {
          id: '1',
        },
      };

      // Act
      const result = await apiGatewayAdaptor.handler(event);

      // Assert
      expect(result.statusCode).toEqual(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Recording Not Found',
      });
    });
  });

  describe('Error', () => {
    const s3Mock = mockClient(S3Client);
    const storageAdaptor = new StorageAdaptor(new S3Client({}), '', new UIDGenerator());
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, 'invalid-table', recordingFactory);
    const domain = new SystemDeleteRecordingsDomain(repository, storageAdaptor);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    beforeEach(() => {
      s3Mock.reset();
    });

    it('should throw an error 500', async () => {
      // Arrange
      s3Mock.onAnyCommand().rejects({ });
      const event = {
        ...eventMock,
        pathParameters: {
          id: '1',
        },
      };

      // Act
      const result = await apiGatewayAdaptor.handler(event);

      // Assert
      expect(result.statusCode).toEqual(500);
      // expect(result.body).toEqual('{"error":"Unable to delete assets"}');
    });
  });
});
