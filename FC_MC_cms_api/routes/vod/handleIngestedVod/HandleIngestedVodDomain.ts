import { Context, EventBridgeEvent } from 'aws-lambda';

import {
  IngestedVodEvent, MediaJobStatus, MrssIngestionStatus, OutputGroupDetail,
} from '../../shared/dto/vod/IngestDto';
import { IEpisodeRepository } from '../episode/shared/IEpisodeRepository';
import { IIngestionRepository } from '../ingestion/shared/IIngestionRepository';
import { IngestionError } from '../ingestion/shared/IngestionError';
import { IMovieRepository } from '../movie/shared/IMovieRepository';
import { IIngester } from '../shared/IIngester';

import IIngestedVodDomain from './IIngestedVodDomain';

export default class IngestedVodDomain implements IIngestedVodDomain {
  constructor(
    private readonly ingestionRepository: IIngestionRepository,
    private readonly mediapackageIngester: IIngester,
    private readonly episodeRepository: IEpisodeRepository,
    private readonly movieRepository: IMovieRepository,
  ) {}

  private static buildMediaPackageAssetId(
    ingestionId: string,
    type: string,
    id: string,
    jobId: string,
  ): string {
    const stage = (process.env.ENV ?? 'unknown').toLowerCase();
    const sanitizedJobId = jobId.replace(/[^A-Za-z0-9_-]/g, '-');
    return `${stage}_${ingestionId}_${type}_${id}_${sanitizedJobId}`;
  }

  private async persistMediapackageId(
    type: string,
    id: string,
    mediapackageId: string,
  ): Promise<void> {
    try {
      if (type === 'episode' || type === 'episodes') {
        await this.episodeRepository.appendMediapackageId(id, mediapackageId);
      } else if (type === 'movie' || type === 'movies') {
        await this.movieRepository.appendMediapackageId(id, mediapackageId);
      }
      console.log(
        `[IngestedVodDomain] Saved mediapackageId="${mediapackageId}" on ${type}/${id}`,
      );
    } catch (e) {
      console.error(
        `[IngestedVodDomain] Failed to persist mediapackageId="${mediapackageId}" on ${type}/${id}:`,
        e,
      );
    }
  }

  private async handleEntityStream(
    type: string,
    id: string,
    outputGroupDetails: Array<OutputGroupDetail>,
    ingestionId: string,
    jobId: string,
  ) : Promise<void> {
    if (type !== 'episodes' && type !== 'movies' && type !== 'movie' && type !== 'episode') return;
    const s3Path = /\/((movies|episodes|movie|episode)\/.*$)/;

    const assetId = IngestedVodDomain.buildMediaPackageAssetId(ingestionId, type, id, jobId);
    let assetPersisted = false;

    await Promise.all(outputGroupDetails.map(
      async (outputGroupDetail) => {
        await Promise.all(
          outputGroupDetail.playlistFilePaths.map(async (playlistFilePath) => {
            const matches = await playlistFilePath.match(s3Path);

            if (matches?.length) {
              await this.mediapackageIngester.ingest(assetId, id, matches[1]);
              if (!assetPersisted) {
                assetPersisted = true;
                await this.persistMediapackageId(type, id, assetId);
              }
            }
          }),
        );
      },
    ));
  }

  async updateJobStatus(
    ingestionId: string,
    entityId: string,
    status: MediaJobStatus,
    error?: string,
  ) {
    const ingestion = await this.ingestionRepository.findOne(ingestionId);

    if (!ingestion) throw new IngestionError.IngestionNotFound(`id: ${ingestionId}`);

    await this.ingestionRepository.updateJobField(ingestion, entityId, status);

    if (status === MediaJobStatus.MEDIACONVERT_ERROR) {
      await ingestion.addFailure(`${new Date().toISOString()}: Transcoding Error: ${entityId}: ${error}`);
      await this.ingestionRepository.updateUniqueField<Array<string>>(ingestion, 'failures', ingestion.failures ?? []);
    }
  }

  async updateIngestionStatus(ingestionId: string) {
    const ingestion = await this.ingestionRepository.findOne(ingestionId);

    if (!ingestion) throw new IngestionError.IngestionNotFound(`id: ${ingestionId}`);
    if (await ingestion.isIngestionFailed()) { await this.ingestionRepository.updateStatus(ingestion, 'status', MrssIngestionStatus.FAILED); }
  }

  async setVodStream(
    ingestedVodEvent: EventBridgeEvent<string, IngestedVodEvent>,
    _context?: Context,
  ): Promise<void> {
    const vodEntityRegex = /^(episodes|movies|episode|movie)\/([\w'-]+)$/;

    if (
      ingestedVodEvent.detail.userMetadata.entityId !== undefined
      && ingestedVodEvent.detail.userMetadata.ingestionId !== undefined
    ) {
      const entityMatches = ingestedVodEvent.detail.userMetadata.entityId.match(vodEntityRegex);

      if (!entityMatches) throw new Error('This item do not need Stream creation.');

      const [fullMatch, type, id] = entityMatches;
      console.log(fullMatch, type, id);

      const jobId = ingestedVodEvent.detail.jobId
        ?? `${ingestedVodEvent.id ?? Date.now()}`;

      await this.handleEntityStream(
        type,
        id,
        ingestedVodEvent.detail.outputGroupDetails,
        ingestedVodEvent.detail.userMetadata.ingestionId,
        jobId,
      );
    }
  }
}
