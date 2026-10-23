import { mockJestTimers } from '../../../../../utils/jest-utils';
import { IngestionRequestDto, MrssIngestionStatus } from '../../../../shared/dto/vod/IngestDto';
import IngestionFactory from '../IngestionFactory';

mockJestTimers();

const INGESTION_ID = 'INGESTION-ID';
const INGESTION_UID = {
  generate: () => INGESTION_ID,
};

describe('Ingestion Factory', () => {
  describe('toDomain', () => {
    describe('success', () => {
      it('it should create a Ingestion instance', async () => {
        const ingestionProps: IngestionRequestDto = {
          extId: 'vubiquity_Value_Reelz',
          parentId: 'parent-id',
          status: MrssIngestionStatus.IN_PROGRESS,
        };
        const ingestionFactory = new IngestionFactory(INGESTION_UID);

        // Act
        const ingestion = await ingestionFactory.toDomain(ingestionProps);

        // Assert
        expect(ingestion.id).toEqual('INGESTION-ID');
        expect(ingestion.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
      });
    });
  });

  it('toPersistence', async () => {
    // Arrange
    const ingestionProps: IngestionRequestDto = {
      id: 'ingestion-id-other',
      parentId: 'parent-id',
      extId: 'vubiquity_Value_Reelz',
      status: MrssIngestionStatus.SUCCESSFUL,
      saved: ['1', '2', '3'],
    };
    const ingestionFactory = new IngestionFactory(INGESTION_UID);

    // Act
    const ingestion = await ingestionFactory.toDomain(ingestionProps);

    // Act
    const rawIngestion = await ingestionFactory.toPersistence(ingestion);

    // Assert
    expect(rawIngestion).toEqual({
      id: 'ingestion-id-other',
      parentId: 'parent-id',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      extId: 'vubiquity_Value_Reelz',
      status: MrssIngestionStatus.SUCCESSFUL,
      jobs: {},
      failures: [],
      saved: ['1', '2', '3'],
    });
  });
});
