import { MediaPackageClient, TooManyRequestsException, UnprocessableEntityException } from '@aws-sdk/client-mediapackage';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { mockClient } from 'aws-sdk-client-mock';

import { EventBridgeEvent } from 'aws-lambda';

import { MovieRating } from '../../../asset/shared/Rating';
import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto, RecordingEvent, RecordingStatus } from '../../../shared/dto/RecordingDto';
import OneTimeScheduleAdaptor from '../../../shared/scheduler/OneTimeScheduleAdaptor';
import RecorderAdaptor from '../../shared/RecorderAdaptor';
import RecordingFactory from '../../shared/RecordingFactory';
import RecordingRepository from '../../shared/RecordingRepository';
import EventBridgeAdaptor from '../EventBridgeAdaptor';
import RecorderDomain from '../RecorderDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-eventBridgeAdaptor');
mockJestTimers();

const epgProgram: EPGProgram = {
  id: new UIDGenerator().generate(8),
  title: 'Yahoo! Finance Live',
  ext_id: '202639449', // should be unique
  duration: '3600',
  start_time: '2022-09-30T10:01:00Z', // Should be anterior to 10/17
  end_time: '2022-09-30T10:00:00Z', // Should be anterior to 10/17
  thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
  alternateThumbnail: null,
  archive: false,
  rating: MovieRating.PG,
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

const mpClientMock = mockClient(MediaPackageClient);
const schedulerClientMock = mockClient(SchedulerClient);
const oneTimeScheduler = new OneTimeScheduleAdaptor(new SchedulerClient({}));
const mpClient = new MediaPackageClient({});
const recordingFactory = new RecordingFactory();
const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
const recorderAdaptor = new RecorderAdaptor(mpClient);
const domain = new RecorderDomain(repository, recorderAdaptor, oneTimeScheduler);

describe('EventBridge Adaptor ', () => {
  describe('handler - PENDING status', () => {
    beforeEach(() => {
      mpClientMock.reset();
      schedulerClientMock.reset();
    });

    it('should start a new recording and update status in database', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().resolves({});
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.PENDING,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      const updatedRecording = await repository.findOne(recordingDto.id);

      // Assert
      // start() only updates the playlist status; the global status is left as is
      expect(updatedRecording?.status).toEqual(RecordingStatus.PENDING);
      expect(updatedRecording?.dashStatus).toEqual(RecordingStatus.PENDING);
      expect(updatedRecording?.hlsStatus).toEqual(RecordingStatus.STARTED);
    });

    it('should start a new recording and throw a LimitExceeded Exception', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejects(new TooManyRequestsException({ $metadata: {}, message: '' }));
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.PENDING,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      const updatedRecording = await repository.findOne(recordingDto.id);

      // Assert
      // Queuing either playlist moves the whole recording to QUEUED
      expect(updatedRecording?.status).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.hlsStatus).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.dashStatus).toEqual(RecordingStatus.PENDING);
    });

    it('should throw a LimitExceeded Exception for both HLS & DASH', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejects(new TooManyRequestsException({ $metadata: {}, message: '' }));
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.PENDING,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      await eventBridgeAdaptor.handler({
        ...event,
        detail: {
          harvest_job: {
            ...event.detail.harvest_job,
            id: `${Date.now()}-${epgProgram.id}-DASH`,
          },
        },
      });
      const updatedRecording = await repository.findOne(recordingDto.id);

      // Assert
      expect(updatedRecording?.status).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.hlsStatus).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.dashStatus).toEqual(RecordingStatus.QUEUED);
    });

    it('should throw a LimitExceeded Exception only for HLS', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejectsOnce(new TooManyRequestsException({ $metadata: {}, message: '' }));
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().resolves({});
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.PENDING,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      await eventBridgeAdaptor.handler({
        ...event,
        detail: {
          harvest_job: {
            ...event.detail.harvest_job,
            id: `${Date.now()}-${epgProgram.id}-DASH`,
          },
        },
      });
      const updatedRecording = await repository.findOne(recordingDto.id);

      // Assert
      // Still QUEUED overall, so startNext() picks the HLS half up later
      expect(updatedRecording?.status).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.hlsStatus).toEqual(RecordingStatus.QUEUED);
      expect(updatedRecording?.dashStatus).toEqual(RecordingStatus.STARTED);
    });
  });

  describe('handler - SUCCEEDED status', () => {
    let archiveSpy: jest.SpyInstance;
    let startNextSpy: jest.SpyInstance;
    let startSpy: jest.SpyInstance;

    // mockRestore, not mockReset: a reset spy no longer calls through, which turned
    // domain.archive/start into no-ops for every later test
    afterEach(() => {
      archiveSpy.mockRestore();
      startNextSpy.mockRestore();
      startSpy.mockRestore();
    });

    beforeEach(() => {
      mpClientMock.reset();
    });

    it('should start only the first QUEUED recording', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().resolves({});
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.SUCCEEDED,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const NB_OF_QUEUED_RECORDING = 4;
      const initialRecording = await recordingFactory
        .toDomain({ ...recordingDto, status: RecordingStatus.STARTED });
      await repository.save(initialRecording);
      await Promise.all(Array
        .from(Array(NB_OF_QUEUED_RECORDING).keys()).map(async (key) => {
          const recording = await recordingFactory.toDomain({
            ...recordingDto,
            id: key.toString(),
            status: RecordingStatus.QUEUED,
          });
          return repository.save(recording);
        }));
      archiveSpy = jest.spyOn(domain, 'archive');
      startNextSpy = jest.spyOn(domain, 'startNext');
      startSpy = jest.spyOn(domain, 'start');
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler({
        ...event,
        detail: {
          harvest_job: {
            ...event.detail.harvest_job,
            id: `${Date.now()}-${epgProgram.id}-DASH`,
          },
        },
      });
      await eventBridgeAdaptor.handler(event);
      const queuedRecording = await repository.findAllByStatus(RecordingStatus.QUEUED);
      const succeededRecording = await repository.findAllByStatus(RecordingStatus.SUCCEEDED);
      const startedRecording = await repository.findAllByStatus(RecordingStatus.STARTED);

      // Assert
      // startNext() only takes queued[0]. Starting it does not change its global status, so
      // the second startNext() picks the same recording again and has nothing left to start.
      const startedQueued = queuedRecording
        .filter((item) => item.hlsStatus === RecordingStatus.STARTED
          && item.dashStatus === RecordingStatus.STARTED);
      expect(queuedRecording).toHaveLength(NB_OF_QUEUED_RECORDING);
      expect(startedQueued).toHaveLength(1);
      expect(succeededRecording).toHaveLength(1); // Needs to have both HLS & DASH done
      expect(startedRecording).toHaveLength(0);
      expect(archiveSpy).toHaveBeenCalledTimes(2);
      expect(startNextSpy).toHaveBeenCalledTimes(2);
      expect(startSpy).toHaveBeenCalledTimes(2); // DASH + HLS of the first queued recording
    });

    it('should try to start a QUEUED then throw a LimitExceededException', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejectsOnce(new TooManyRequestsException({ $metadata: {}, message: '' }));
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().resolves({});
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.SUCCEEDED,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const NB_OF_QUEUED_RECORDING = 2;
      const initialRecording = await recordingFactory
        .toDomain({ ...recordingDto, status: RecordingStatus.STARTED });
      await repository.save(initialRecording);
      await Promise.all(Array
        .from(Array(NB_OF_QUEUED_RECORDING).keys()).map(async (key) => {
          const recording = await recordingFactory.toDomain({
            ...recordingDto,
            id: key.toString(),
            status: RecordingStatus.QUEUED,
          });
          return repository.save(recording);
        }));
      archiveSpy = jest.spyOn(domain, 'archive');
      startNextSpy = jest.spyOn(domain, 'startNext');
      startSpy = jest.spyOn(domain, 'start');
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler({
        ...event,
        detail: {
          harvest_job: {
            ...event.detail.harvest_job,
            id: `${Date.now()}-${epgProgram.id}-DASH`,
          },
        },
      });
      await eventBridgeAdaptor.handler(event);
      const queuedRecording = await repository.findAllByStatus(RecordingStatus.QUEUED);
      const succeededRecording = await repository.findAllByStatus(RecordingStatus.SUCCEEDED);
      const startedRecording = await repository.findAllByStatus(RecordingStatus.STARTED);

      // Assert
      // First startNext(): DASH hits the limit and is queued, HLS starts. Second startNext():
      // the same recording is still queued[0], so only its queued DASH half is retried.
      const startedQueued = queuedRecording
        .filter((item) => item.hlsStatus === RecordingStatus.STARTED
          && item.dashStatus === RecordingStatus.STARTED);
      expect(queuedRecording).toHaveLength(NB_OF_QUEUED_RECORDING);
      expect(startedQueued).toHaveLength(1);
      expect(succeededRecording).toHaveLength(1);
      expect(startedRecording).toHaveLength(0);
      expect(archiveSpy).toHaveBeenCalledTimes(2);
      expect(startNextSpy).toHaveBeenCalledTimes(2);
      expect(startSpy).toHaveBeenCalledTimes(3);
    });

    it('should start QUEUED items but leave PENDING ones alone', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().resolves({});
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.SUCCEEDED,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const initialRecording = await recordingFactory
        .toDomain({
          ...recordingDto,
          status: RecordingStatus.STARTED,
          dashStatus: RecordingStatus.SUCCEEDED,
          hlsStatus: RecordingStatus.STARTED,
        });
      const pendingRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '1',
        status: RecordingStatus.PENDING,
        hlsStatus: RecordingStatus.PENDING,
        dashStatus: RecordingStatus.QUEUED,
      });
      const queuedRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '2',
        status: RecordingStatus.QUEUED,
        hlsStatus: RecordingStatus.QUEUED,
        dashStatus: RecordingStatus.QUEUED,
      });
      await repository.save(initialRecording);
      await repository.save(pendingRecording);
      await repository.save(queuedRecording);
      archiveSpy = jest.spyOn(domain, 'archive');
      startNextSpy = jest.spyOn(domain, 'startNext');
      startSpy = jest.spyOn(domain, 'start');
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      const queuedRecordingResult = await repository.findAllByStatus(RecordingStatus.QUEUED);
      const succeededRecording = await repository.findAllByStatus(RecordingStatus.SUCCEEDED);
      const startedRecording = await repository.findAllByStatus(RecordingStatus.STARTED);

      // Assert
      const pendingRecordingResult = await repository.findOne(pendingRecording.id);
      expect(queuedRecordingResult).toHaveLength(1);
      expect(queuedRecordingResult[0].hlsStatus).toEqual(RecordingStatus.STARTED);
      expect(queuedRecordingResult[0].dashStatus).toEqual(RecordingStatus.STARTED);
      expect(pendingRecordingResult?.status).toEqual(RecordingStatus.PENDING);
      expect(pendingRecordingResult?.hlsStatus).toEqual(RecordingStatus.PENDING);
      expect(succeededRecording).toHaveLength(1);
      expect(startedRecording).toHaveLength(0);
      expect(archiveSpy).toHaveBeenCalledTimes(1);
      expect(startNextSpy).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenCalledTimes(2);
    });

    it('should QUEUED both HLS & DASH when a LimitExceededException is thrown', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejects(new TooManyRequestsException({ $metadata: {}, message: '' }));
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.SUCCEEDED,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const NB_OF_QUEUED_RECORDING = 2;
      const initialRecording = await recordingFactory
        .toDomain({ ...recordingDto, status: RecordingStatus.STARTED });
      await repository.save(initialRecording);
      await Promise.all(Array
        .from(Array(NB_OF_QUEUED_RECORDING).keys()).map(async (key) => {
          const recording = await recordingFactory.toDomain({
            ...recordingDto,
            id: key.toString(),
            status: RecordingStatus.QUEUED,
          });
          return repository.save(recording);
        }));
      archiveSpy = jest.spyOn(domain, 'archive');
      startNextSpy = jest.spyOn(domain, 'startNext');
      startSpy = jest.spyOn(domain, 'start');
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler({
        ...event,
        detail: {
          harvest_job: {
            ...event.detail.harvest_job,
            id: `${Date.now()}-${epgProgram.id}-DASH`,
          },
        },
      });
      await eventBridgeAdaptor.handler(event);
      const queuedRecording = await repository.findAllByStatus(RecordingStatus.QUEUED);
      const succeededRecording = await repository.findAllByStatus(RecordingStatus.SUCCEEDED);
      const startedRecording = await repository.findAllByStatus(RecordingStatus.STARTED);

      // Assert
      expect(queuedRecording).toHaveLength(NB_OF_QUEUED_RECORDING);
      expect(succeededRecording).toHaveLength(1);
      expect(startedRecording).toHaveLength(0);
      expect(archiveSpy).toHaveBeenCalledTimes(2);
      expect(startNextSpy).toHaveBeenCalledTimes(2);
      // Both startNext() calls retry DASH + HLS of the same first queued recording
      expect(startSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('handler - startNext()', () => {
    beforeEach(() => {
      mpClientMock.reset();
      schedulerClientMock.reset();
    });

    it('should archive the recording and not pull PENDING items', async () => {
      // Arrange
      schedulerClientMock.onAnyCommand().resolves({});
      mpClientMock.onAnyCommand().rejectsOnce(new UnprocessableEntityException({ $metadata: {}, message: '' }));
      const event: EventBridgeEvent<string, RecordingEvent> = {
        'detail-type': '',
        'replay-name': '',
        account: '',
        detail: {
          harvest_job: {
            id: `${Date.now()}-${epgProgram.id}-HLS`,
            status: RecordingStatus.SUCCEEDED,
            start_time: epgProgram.start_time,
            end_time: epgProgram.end_time,
            channel_id: recordingDto.extId,
            s3_destination: {
              bucket_name: 'test-npvr',
              manifest_key: recordingDto.destination.hls,
              role_arn: 'arn:aws:iam::XXXXX:role/MediaPackage-S3-Full-Access',
            },
            origin_endpoint_id: 'HLS_vubiquity_Value_Reelz_Encrypted',
          },
        },
        id: '',
        region: '',
        resources: [],
        source: '',
        time: '',
        version: '',
      };
      const initialRecording = await recordingFactory
        .toDomain({
          ...recordingDto,
          status: RecordingStatus.STARTED,
          dashStatus: RecordingStatus.SUCCEEDED,
          hlsStatus: RecordingStatus.STARTED,
        });
      const { program } = recordingDto;
      const pendingRecording = await recordingFactory.toDomain({
        ...recordingDto,
        id: '1',
        program: {
          // @ts-ignore
          ...program,
          end_time: '2022-11-30T10:00:00Z',
        },
        status: RecordingStatus.PENDING,
        hlsStatus: RecordingStatus.PENDING,
        dashStatus: RecordingStatus.PENDING,
      });
      await repository.save(initialRecording);
      await repository.save(pendingRecording);
      const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

      // Act
      await eventBridgeAdaptor.handler(event);
      const recordingMetadata = await repository.findOne(initialRecording.id);
      const pendingRecordingResult = await repository.findOne(pendingRecording.id);

      // Assert
      expect(recordingMetadata?.status).toEqual(RecordingStatus.SUCCEEDED);
      expect(pendingRecordingResult?.status).toEqual(RecordingStatus.PENDING);
    });
  });
});
