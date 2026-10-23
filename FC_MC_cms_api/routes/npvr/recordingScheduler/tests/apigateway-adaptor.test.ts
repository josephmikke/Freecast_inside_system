import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { mockClient } from 'aws-sdk-client-mock';

import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import { MovieRating, Rating } from '../../../asset/shared/Rating';
import Channel from '../../../channel/shared/Channel';
import EPG from '../../../epg/shared/EPG';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import OneTimeScheduleAdaptor from '../../../shared/scheduler/OneTimeScheduleAdaptor';
import AtExpression, { AtExpressionError } from '../../../shared/valueObjects/AtExpression';
import CronTask from '../../../shared/valueObjects/CronTask';
import MediaPackageId from '../../../shared/valueObjects/MediaPackageId';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import RecordingFactory from '../../shared/RecordingFactory';
import RecordingRepository from '../../shared/RecordingRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import RecordingSchedulerDomain from '../RecordingSchedulerDomain';

import eventMock from './event-mock';

const dateMock = mockJestTimers();
const { ddbClient, TEST_TABLE_NAME } = initDatabase('test-addRecordingApiGatewayAdaptor');
const schedulerClientMock = mockClient(SchedulerClient);
const oneTimeScheduler = new OneTimeScheduleAdaptor(new SchedulerClient({}));
const recordingFactory = new RecordingFactory();
const repository = new RecordingRepository(
  ddbClient,
  TEST_TABLE_NAME,
  recordingFactory,
);

const mockChannel = Channel.create({
  epg: '',
  extId: 'value:282',
  createdAt: dateMock,
  updatedAt: dateMock,
  name: 'Abel Becker',
  slug: 'value:282',
  lcn: 13,
  vastId: 'vastid',
  rating: Rating.TV_Y,
  description: 'Value Channels',
  visible: true,
  catchUpActive: true,
  availableDate: 'avail-date',
  expirationDate: 'expire-date',
  mediapackageId: new MediaPackageId('vubiquity_Reelz_HD'),
  thumbnail: 'channels/9940b5a1631b5275/thumbnail.png',
  exclude: '',
  enabled: true,
}, 'channel-id');

const mockNoMediaPackageIdChannel = Channel.create({
  epg: '',
  extId: 'value:282',
  createdAt: dateMock,
  updatedAt: dateMock,
  name: 'Abel Becker',
  slug: 'value:282',
  lcn: 13,
  vastId: 'vastid',
  rating: Rating.TV_Y,
  description: 'Value Channels',
  visible: true,
  catchUpActive: true,
  availableDate: 'avail-date',
  expirationDate: 'expire-date',
  mediapackageId: new MediaPackageId(''),
  thumbnail: 'channels/9940b5a1631b5275/thumbnail.png',
  exclude: '',
  enabled: true,
}, 'channel-id-err');

const epg: EPG = {
  addEPGTemplate: jest.fn(),
  addEPGPrograms: jest.fn(),
  updateThumbnail: jest.fn(),
  id: 'epg-id',
  extId: 'json-epg-1',
  createdAt: '2023-02-10T15:39:03.354Z',
  updatedAt: '2023-02-19T15:40:39.368Z',
  enabled: true,
  name: 'Test JSON EPG',
  epgTemplate: {
    id: 'e73a631580e37b2e',
    extId: 'json-template-2',
    createdAt: '2023-02-10T15:31:12.481Z',
    updatedAt: '2023-02-10T15:31:12.481Z',
    name: 'JSON',
    enabled: true,
    mapping: {
      duration: {
        duration: '$.duration',
        duration_format: 'seconds',
      },
      start_time: {
        date: '$.start_time',
        date_format: null,
        time: null,
        time_format: null,
        method: 'concat',
      },
      thumbnail: '$.thumbnail',
      epg_program: '$.epg_programs',
      ext_id: '$.ext_id',
      end_time: {
        date: '$.end_time',
        date_format: null,
        time: null,
        time_format: null,
        method: 'concat',
      },
      epgs_list: '$[0]',
      description: '$.description',
      title: '$.title',
    },
    templateType: EpgTemplateType.JSON,
  },
  programs: [
    {
      id: 'program-id',
      subtitle: null,
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/3x4_Vertical_YF.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.G,
      catchup: false,
      description: 'YFI Highlights brings you a roundup of the best business and finance stories of the day.',
      duration: '7200',
      end_time: '2022-11-30T13:59:59.00Z',
      ext_id: '202837105',
      slug: '',
      start_time: '2022-11-30T11:59:59.00Z',
      title: 'YFi Highlights',
    },
  ],
  ingestionSchedule: new CronTask('40 16 ? 1-12 1-7 *', 'aws-cloud-watch'),
  timezone: 'Europe/Paris',
  thumbnail: new Thumbnail('epg/7805ca8c2f8b4e7c/thumbnail.png'),
  ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.json',
};

mockChannel.updateEPG(epg);
mockNoMediaPackageIdChannel.updateEPG(epg);

describe('ApiGateway Adaptor', () => {
  afterEach(() => {
    schedulerClientMock.reset();
  });
  describe('Exceptions', () => {
    it('should throw a Channel Not Found Exception and return a 422 status code', async () => {
      // Assert
      schedulerClientMock.resolves({});
      const channelRepository = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );

      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'invalid-id',
          username: 'johndoe',
          program: '10',
        },
      };

      // Act
      expect(await apiGatewayAdaptor.handler(mock)).toEqual({
        body: '{"error":"Channel Not Found"}',
        statusCode: 422,
      });
    });

    it('should throw a Program Not Found Exception and return a 422 status code', async () => {
      // Assert
      schedulerClientMock.resolves({});
      const channelRepository = {
        findAll: jest.fn(),
        // The domain retries with a startTime lookup when the program isn't in the EPG
        findOne: jest.fn()
          .mockResolvedValueOnce(mockChannel)
          .mockResolvedValueOnce({ ...mockChannel, epg: undefined }),
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'channel.id',
          username: 'johndoe',
          program: '10',
        },
      };

      // Act
      expect(await apiGatewayAdaptor.handler(mock)).toEqual({
        body: '{"error":"Program Not Found"}',
        statusCode: 422,
      });
    });

    it('should throw a Unable to Create Schedule Exception and return a 500 status code', async () => {
      // Assert
      schedulerClientMock.rejects({});
      const channelRepository = {
        findAll: jest.fn(),
        findOne: async () => mockChannel,
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'channel-id',
          username: 'johndoe',
          program: 'program-id',
        },
      };

      // Act
      expect(await apiGatewayAdaptor.handler(mock)).toEqual({
        body: '{"error":"Recording scheduler: Unable to create schedule: Error: Error: Error"}',
        statusCode: 500,
      });
    });
  });

  describe('Success', () => {
    let onTimeSchedulerSpy: jest.SpyInstance<Promise<boolean>>;

    beforeEach(() => {
      onTimeSchedulerSpy = jest.spyOn(oneTimeScheduler, 'schedule');
    });

    afterEach(() => {
      onTimeSchedulerSpy.mockRestore();
    });

    it('should throw because channel have empty mediapackageId', async () => {
      schedulerClientMock.resolves({});
      const channelRepository = {
        findAll: jest.fn(),
        findOne: async () => mockNoMediaPackageIdChannel,
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'channel-id-err',
          username: 'johndoe',
          program: 'program-id',
        },
      };

      // Act & Assert
      expect(await apiGatewayAdaptor.handler(mock)).toEqual({
        body: '{"error":"Invalid MediaPackage id: Error: MediaPackage id is not set."}',
        statusCode: 422,
      });
    });

    it('should create a new recording request', async () => {
      // Arrange
      // jest.spyOn(SchedulerClient, 'CreateScheduleCommand');
      schedulerClientMock.resolves({});
      const channelRepository = {
        findAll: jest.fn(),
        findOne: async () => mockChannel,
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'channel-id',
          username: 'johndoe',
          program: 'program-id',
        },
      };

      // Act & Assert
      expect(await apiGatewayAdaptor.handler(mock)).toEqual({
        body: '',
        headers: {
          Location: '/npvr/johndoe/program-id',
        },
        statusCode: 201,
      });
    });

    it('should create a new recording request and reuse the same schedules', async () => {
      // Arrange
      schedulerClientMock.resolves({});
      const channelRepository = {
        findAll: jest.fn(),
        findOne: async () => mockChannel,
        findMany: jest.fn(),
        hasRelationships: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        exists: jest.fn(),
      };
      const domain = new RecordingSchedulerDomain(
        oneTimeScheduler,
        repository,
        recordingFactory,
        {
          identity: {
            schedulerArn: process.env.ONE_TIME_SCHEDULER_ARN!,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
          s3destination: {
            bucketName: 'test-npvr',
            roleArn: 'arn:aws:iam::XXXX:role/RoleName',
          },

        },
        channelRepository,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const mock = {
        ...eventMock,
        body: {
          channel: 'channel-id',
          username: 'johndoe',
          program: 'program-id',
        },
      };

      // Act
      await apiGatewayAdaptor.handler(mock);
      await apiGatewayAdaptor.handler(mock);

      // Assert
      expect(onTimeSchedulerSpy)
        .toHaveBeenCalledTimes(2); // It should be called 2 times instead of 4
    });
  });

  describe('formatEndTime - AtExpression tests', () => {
    schedulerClientMock.resolves({});
    const program = {
      id: 'program-id',
      subtitle: null,
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/3x4_Vertical_YF.jpg',
      alternateThumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/3x4_Vertical_YF.jpg',
      catchup: false,
      description: 'YFI Highlights brings you a roundup of the best business and finance stories of the day.',
      duration: '7200',
      end_time: '2022-11-30T13:59:59.00Z',
      ext_id: '202837105',
      archive: false,
      rating: null,
      slug: '',
      start_time: '2022-11-30T11:59:59.00Z',
      title: 'YFi Highlights',
    };

    it('Should not throw any error', () => {
      const validDate1 = '2023-04-20T10:00:00Z';
      const validDate2 = '2023-04-20T10:00:00.000Z';

      expect(new AtExpression(RecordingSchedulerDomain.formatEndTime({
        ...program,
        end_time: validDate1,
      }))).toBeDefined();

      expect(new AtExpression(RecordingSchedulerDomain.formatEndTime({
        ...program,
        end_time: validDate2,
      }))).toBeDefined();
    });

    it('Should throw invalid format exception', async () => {
      const invalidDate = '2023-04-20 10:00:00Z';

      await expect(async () => new AtExpression(RecordingSchedulerDomain.formatEndTime({
        ...program,
        end_time: invalidDate,
      }))).rejects.toThrowError(AtExpressionError.InvalidAtExpression);
    });
  });
});
