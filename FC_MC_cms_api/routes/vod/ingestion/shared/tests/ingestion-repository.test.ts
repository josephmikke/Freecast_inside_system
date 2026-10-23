import { initDatabase, mockJestTimers } from '../../../../../utils/jest-utils';
import { IngestionDto, MediaJobStatus, MrssIngestionStatus } from '../../../../shared/dto/vod/IngestDto';
import { IFactory } from '../../../../shared/interfaces/IFactory';
import { IIngestionRepository } from '../IIngestionRepository';
import Ingestion from '../Ingestion';
import IngestionFactory from '../IngestionFactory';
import IngestionRepository from '../IngestionRepository';

const dateMock = mockJestTimers();
const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-ingestionRepository');

const INGESTION_ID = 'INGESTION-ID';
const INGESTION_UID = {
  generate: () => INGESTION_ID,
};

let fakeFactory: IFactory<any, any, any>;
let fakeRepository: IIngestionRepository;

describe('Ingestion Repository', () => {
  const ingestionDto: IngestionDto = {
    id: 'random-id',
    parentId: 'parent-id',
    extId: 'vubiquity_Value_Reelz',
    status: MrssIngestionStatus.FAILED,
    failures: ['failure'],
  };

  it('should return all an empty array', async () => {
    // Arrange
    const ingestionFactory = new IngestionFactory(INGESTION_UID);
    const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);

    expect(await repository.findAll()).toEqual({ ingestions: [], nextToken: undefined });
  });

  it('should store new ingestion request with the jobs Map', async () => {
    // Arrange
    const ingestionFactory = new IngestionFactory(INGESTION_UID);
    const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
    const ingestion = await ingestionFactory.toDomain({
      ...ingestionDto,
      jobs: {
        1: MediaJobStatus.MEDIACONVERT_SUBMITTED,
        2: MediaJobStatus.MEDIACONVERT_PROGRESSING,
      },
    });

    // Act
    const result = await repository.save(ingestion);

    // Assert
    const { Item } = await repository.getItem({
      PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
      SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
    });

    expect(result).toBeTruthy();
    expect(Item).toEqual({
      PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
      SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
      'GSI1-PK': `${IngestionRepository.RootEntityType}`,
      'GSI1-SK': `${IngestionRepository.RootEntityType}#${ingestion.id}`,
      entityType: IngestionRepository.RootEntityType,
      searchIngestionId: ingestion.id,
      id: ingestion.id,
      parentId: 'parent-id',
      createdAt: dateMock,
      updatedAt: dateMock,
      enabled: true,
      status: MrssIngestionStatus.FAILED,
      jobs: {
        1: MediaJobStatus.MEDIACONVERT_SUBMITTED,
        2: MediaJobStatus.MEDIACONVERT_PROGRESSING,
      },
      extId: ingestionDto.extId,
      searchExtId: ingestionDto.extId.toLowerCase(),
      failures: ['failure'],
      saved: [],
    });
  });

  describe('exists', () => {
    it('should return true if ingestion exists', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);

      // Act
      const exists = await repository.exists(ingestion);

      // Assert
      expect(exists).toBeTruthy();
    });

    it('should return false if a ingestion does not exist', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);

      // Act
      const exists = await repository.exists(ingestion);

      // Assert
      expect(exists).toBeFalsy();
    });
  });

  describe('findOne', () => {
    it('should find one ingestion request', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);

      // Act
      const result = await repository.findOne(ingestionDto.id);

      // Assert
      expect(result).toEqual(ingestion);
    });

    it('should return undefined', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);

      // Act
      const result = await repository.findOne('fakeId');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find multiple ingestions', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);
      await repository.save(await ingestionFactory.toDomain({
        ...ingestionDto,
        id: 'another-id',
      }));
      await repository.save(await ingestionFactory.toDomain({
        ...ingestionDto,
        id: 'another-id-2',
      }));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.ingestions.length).toEqual(3);
      expect(result.nextToken).toBeUndefined();
    });

    it('should have nextToken', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);
      await repository.save(await ingestionFactory.toDomain({
        ...ingestionDto,
        id: 'another-id',
      }));
      await repository.save(await ingestionFactory.toDomain({
        ...ingestionDto,
        id: 'another-id-2',
      }));

      // Act
      const result = await repository.findAll({ limit: 1 });

      // Assert
      expect(result.ingestions.length).toEqual(1);
      expect(result.nextToken).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should remove ingestion request', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);

      // Act
      const result = await repository.remove(ingestion);

      // Assert
      expect(result).toBeTruthy();
    });

    it('should return false if the ingestion request does not exist', async () => {
      // Arrange
      const ingestionFactory = new IngestionFactory(INGESTION_UID);
      const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
      const ingestion = await ingestionFactory.toDomain(ingestionDto);
      await repository.save(ingestion);

      // Act
      const result = await repository.remove({
        ...ingestion,
        id: 'fakeId',
        setStatus: () => {},
        addFailure: () => {},
        addSaved: () => {},
        updateJob: () => {},
        isIngestionCompleted: () => true,
        isIngestionFailed: () => false,
      });

      // Assert
      expect(result).toBeFalsy();
    });
  });

  it('should findAllByStatus ingestion request', async () => {
    // Arrange
    const ingestionFactory = new IngestionFactory(INGESTION_UID);
    const repository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);
    const pendingIngestion = await ingestionFactory.toDomain({ ...ingestionDto, id: '1' });
    const queuedIngestion = await ingestionFactory.toDomain({
      ...ingestionDto,
      id: '2',
      status: MrssIngestionStatus.SCHEDULED,
    });
    const successIngestion = await ingestionFactory.toDomain({
      ...ingestionDto,
      id: '3',
      status: MrssIngestionStatus.SUCCESSFUL,
    });
    await repository.save(pendingIngestion);
    await repository.save(queuedIngestion);
    await repository.save(successIngestion);

    // Act
    const scheduled = await repository.findAllByStatus(MrssIngestionStatus.SCHEDULED);
    const progress = await repository.findAllByStatus(MrssIngestionStatus.IN_PROGRESS);
    const success = await repository.findAllByStatus(MrssIngestionStatus.SUCCESSFUL);
    const failed = await repository.findAllByStatus(MrssIngestionStatus.FAILED);

    // Assert
    expect(scheduled).toHaveLength(1);
    expect(progress).toHaveLength(0);
    expect(success).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });
});

describe.each([
  (payload: Ingestion) => fakeRepository.remove(payload),
  (payload: Ingestion) => fakeRepository.save(payload),
  (status: MrssIngestionStatus) => fakeRepository.findAllByStatus(status),
  (payload: Ingestion) => fakeRepository.exists(payload),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  beforeAll(() => {
    fakeRepository = new IngestionRepository(ddbClient, 'fake-table', fakeFactory);
  });

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
