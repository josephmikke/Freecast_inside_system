import { MovieRating } from '../../../asset/shared/Rating';
import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import { EPGProgram } from '../../../epg/shared/IParser';
import { RecordingDto, RecordingStatus } from '../../../shared/dto/RecordingDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import DashDestination from '../../../shared/valueObjects/DashDestination';
import HlsDestination from '../../../shared/valueObjects/HlsDestination';
import { IRecordingRepository } from '../IRecordingRepository';
import Recording from '../Recording';
import RecordingFactory from '../RecordingFactory';
import RecordingRepository from '../RecordingRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const dateMock = mockJestTimers();
const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-recordingRepository');

let fakeFactory: IFactory<any, any, any>;
let fakeRepository: IRecordingRepository;

describe('Recording Repository', () => {
  const sortById = (a: any, b: any) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  };
  const uidGenerator = new UIDGenerator();
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
    failureReason: 'failure',
  };

  it('should store new recording request with the username', async () => {
    // Arrange
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const recording = await recordingFactory.toDomain(recordingDto);

    // Act
    const result = await repository.save(recording);

    // Assert
    const { Item } = await repository.getItem({
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
    });
    const { Item: user } = await repository.getItem({
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
    });

    expect(result).toBeTruthy();
    expect(Item).toEqual({
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      'GSI1-PK': `${RecordingRepository.RootEntityType}`,
      'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
      entityType: RecordingRepository.RootEntityType,
      searchRecordingId: recording.program.id,
      id: epgProgram.id,
      createdAt: dateMock,
      updatedAt: dateMock,
      enabled: true,
      status: RecordingStatus.PENDING,
      hlsStatus: RecordingStatus.PENDING,
      dashStatus: RecordingStatus.PENDING,
      channel: recordingDto.channel,
      extId: recordingDto.extId,
      program: recordingDto.program,
      destination: {
        dash: 'npvr/channelId/programId/dash/index.mpd',
        hls: 'npvr/channelId/programId/hls/index.m3u8',
      },
      failureReason: 'failure',
    });
    expect(user).toEqual({
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
      'GSI1-PK': `${RecordingRepository.RootEntityType}#${recording.username}`,
      'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
      entityType: RecordingRepository.ChildEntityType,
      username: recording.username,
    });
  });

  it('should store new recording request without the SYSTEM username', async () => {
    // Arrange
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const recording = await recordingFactory.toDomain({ ...recordingDto, username: 'SYSTEM' });

    // Act
    await repository.save(recording);

    // Assert
    const { Item: user } = await repository.getItem({
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#SYSTEM`,
    });
    expect(user).toBeUndefined();
  });

  describe('exists', () => {
    it('should return true if recording exists', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const exists = await repository.exists(recording);

      // Assert
      expect(exists).toBeTruthy();
    });

    it('should return false if a recording does not exist', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);

      // Act
      const exists = await repository.exists(recording);

      // Assert
      expect(exists).toBeFalsy();
    });
  });

  describe('findOne', () => {
    it('should find one recording request', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const result = await repository.findOne(recordingDto.id);

      // Assert
      expect(result).toEqual({ ...recording, username: 'SYSTEM' });
    });

    it('should return undefined', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);

      // Act
      const result = await repository.findOne('fakeId');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  it('should store append the username to an existing recording', async () => {
    // Arrange
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const recording = await recordingFactory.toDomain(recordingDto);
    const expectedRecordingDocument = {
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      'GSI1-PK': `${RecordingRepository.RootEntityType}`,
      'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
      entityType: RecordingRepository.RootEntityType,
      searchRecordingId: recording.program.id,
      id: epgProgram.id,
      createdAt: dateMock,
      updatedAt: dateMock,
      enabled: true,
      status: RecordingStatus.PENDING,
      hlsStatus: RecordingStatus.PENDING,
      dashStatus: RecordingStatus.PENDING,
      channel: recordingDto.channel,
      extId: recordingDto.extId,
      program: recordingDto.program,
      destination: {
        dash: 'npvr/channelId/programId/dash/index.mpd',
        hls: 'npvr/channelId/programId/hls/index.m3u8',
      },
      failureReason: 'failure',
    };
    const expectedFirstUser = {
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
      'GSI1-PK': `${RecordingRepository.RootEntityType}#${recording.username}`,
      'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
      entityType: RecordingRepository.ChildEntityType,
      username: recording.username,
    };
    const expectedSecondUser = {
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#nathan`,
      'GSI1-PK': `${RecordingRepository.RootEntityType}#nathan`,
      'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
      entityType: RecordingRepository.ChildEntityType,
      username: 'nathan',
    };

    // Act
    await repository.save(recording);
    await repository.save({ ...recording, username: 'nathan' });

    // Assert
    const items = await repository.batchGetItem([{
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
    }, {
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
    }, {
      PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      SK: `${RecordingRepository.RootEntityType}#nathan`,
    }]);
    items.sort((a: any, b: any) => {
      if (a['GSI1-PK'] < b['GSI1-PK']) return -1;
      if (a['GSI1-PK'] > b['GSI1-PK']) return 1;
      return 0;
    });

    expect(items).toEqual([expectedRecordingDocument, expectedFirstUser, expectedSecondUser]);
  });

  describe('findOneByUserId', () => {
    it('should return a recording request', async () => {
    // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const result = await repository.findOneByUserId(recordingDto.username, epgProgram.id);

      // Assert
      expect(result).toEqual({
        id: epgProgram.id,
        createdAt: dateMock,
        updatedAt: dateMock,
        enabled: true,
        status: RecordingStatus.PENDING,
        hlsStatus: RecordingStatus.PENDING,
        dashStatus: RecordingStatus.PENDING,
        channel: recordingDto.channel,
        extId: recordingDto.extId,
        program: recordingDto.program,
        username: recordingDto.username,
        destination: {
          dash: new DashDestination('npvr/channelId/programId/dash/index.mpd'),
          hls: new HlsDestination('npvr/channelId/programId/hls/index.m3u8'),
        },
        failureReason: 'failure',
      });
    });

    it('should return undefined', async () => {
    // Arrange
      const recordingId = uidGenerator.generate(8);
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const fakeUsername = await repository.findOneByUserId('fake-username', recordingId);
      const fakeUsernameAndFakeId = await repository.findOneByUserId('fake-username', 'recordingId');
      const fakeId = await repository.findOneByUserId(recordingDto.username, 'recordingId');

      // Assert
      expect(fakeUsername).toBeUndefined();
      expect(fakeUsernameAndFakeId).toBeUndefined();
      expect(fakeId).toBeUndefined();
    });
  });

  describe('findAllByUserId', () => {
    it('should return recording requests', async () => {
    // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const epgPrograms = [epgProgram, { ...epgProgram, id: 'random-id2' }];
      const recordings = await Promise.all(epgPrograms.map(async (program) => {
        const recording = await recordingFactory
          .toDomain({ ...recordingDto, id: program.id, program });
        await repository.save(recording);
        return recording;
      }));
      recordings.sort(sortById);

      // Act
      const result = await repository.findAllByUserId(recordingDto.username);
      result.sort(sortById);

      // Assert
      expect(result).toEqual(recordings);
      expect(result[0].destination.hls).toBeInstanceOf(HlsDestination);
    });

    it('should return an empty array', async () => {
    // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);

      // Act
      const emptyArray = await repository.findAllByUserId('fakeUser');

      // Assert
      expect(emptyArray).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove recording request', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const result = await repository.remove(recording);
      const shouldBeUndefined = await repository
        .findOneByUserId(recordingDto.username, epgProgram.id);
      const shouldBeAnEmptyArray = await repository.batchGetItem([{
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      }, {
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
      },
      ]);

      // Assert
      expect(shouldBeAnEmptyArray).toEqual([]);
      expect(result).toBeTruthy();
      expect(shouldBeUndefined).toBeUndefined();
    });

    it('should return false if the recording request does not exist', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const result = await repository.remove({ ...recording, id: 'fakeId' });

      // Assert
      expect(result).toBeFalsy();
    });
  });

  describe('removeFromUserList', () => {
    it('should remove recording request from user list', async () => {
      // Arrange
      const recordingFactory = new RecordingFactory();
      const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
      const recording = await recordingFactory.toDomain(recordingDto);
      await repository.save(recording);

      // Act
      const result = await repository.removeFromUserList(recording);
      const shouldBeUndefined = await repository
        .findOneByUserId(recordingDto.username, epgProgram.id);
      const shouldHaveOneItem = await repository.batchGetItem([{
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      }, {
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
      },
      ]);

      // Assert
      expect(shouldHaveOneItem).toHaveLength(1);
      expect(result).toBeTruthy();
      expect(shouldBeUndefined).toBeUndefined();
    });
  });

  it('should findAllByStatus recording request', async () => {
    // Arrange
    const recordingFactory = new RecordingFactory();
    const repository = new RecordingRepository(ddbClient, TEST_TABLE_NAME, recordingFactory);
    const pendingRecording = await recordingFactory.toDomain({ ...recordingDto, id: '1' });
    const queuedRecording = await recordingFactory.toDomain({
      ...recordingDto,
      id: '2',
      status: RecordingStatus.QUEUED,
    });
    const successRecording = await recordingFactory.toDomain({
      ...recordingDto,
      id: '3',
      status: RecordingStatus.SUCCEEDED,
    });
    await repository.save(pendingRecording);
    await repository.save(queuedRecording);
    await repository.save(successRecording);

    // Act
    const queued = await repository.findAllByStatus(RecordingStatus.QUEUED);
    const pending = await repository.findAllByStatus(RecordingStatus.PENDING);
    const success = await repository.findAllByStatus(RecordingStatus.SUCCEEDED);
    const failed = await repository.findAllByStatus(RecordingStatus.FAILED);

    // Assert
    expect(queued).toHaveLength(1);
    expect(pending).toHaveLength(1);
    expect(success).toHaveLength(1);
    expect(failed).toHaveLength(0);
    expect(queued[0].username).toEqual('SYSTEM');
    expect(pending[0].username).toEqual('SYSTEM');
    expect(success[0].username).toEqual('SYSTEM');
  });
});

describe.each([
  (payload: Recording) => fakeRepository.remove(payload),
  (payload: Recording) => fakeRepository.save(payload),
  (username: string, id: string) => fakeRepository.findOneByUserId(username, id),
  (status: RecordingStatus) => fakeRepository.findAllByStatus(status),
  (username: string) => fakeRepository.findAllByUserId(username),
  (payload: Recording) => fakeRepository.exists(payload),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  beforeAll(() => {
    fakeRepository = new RecordingRepository(ddbClient, 'fake-table', fakeFactory);
  });

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
