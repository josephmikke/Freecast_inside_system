import { PromisePool } from '@supercharge/promise-pool';
import _ from 'lodash';

import { IHttpClient } from '../../epg/shared/IHttpClient';
import {
  MrssEpisode, MrssMappingTemplate, MrssMovie,
} from '../../shared/dto/MrssDto';
import { MediaJobStatus, MrssIngestionStatus } from '../../shared/dto/vod/IngestDto';
import { VodType } from '../../shared/dto/vod/VodDto';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import Episode from '../episode/shared/Episode';
import EpisodeRepository from '../episode/shared/EpisodeRepository';
import { IIngestionRepository } from '../ingestion/shared/IIngestionRepository';
import Ingestion from '../ingestion/shared/Ingestion';
import IngestionFactory from '../ingestion/shared/IngestionFactory';
import Movie from '../movie/shared/Movie';
import MovieRepository from '../movie/shared/MovieRepository';
import Series from '../series/shared/Series';
import SeriesRepository from '../series/shared/SeriesRepository';
import { ITranscoder } from '../shared/ITranscoder';
import MRSSParser from '../shared/parser/MRSSParser';

import { IIngestVodDomain } from './IIngestVodDomain';

type EntitiesOutput = {
  saved: Array<Episode | Movie | Series>,
  notSaved: Array<string>,
};

export default class IngestVodDomain implements IIngestVodDomain {
  private date: Date = new Date();

  static retryStatus = [
    MediaJobStatus.MEDIACONVERT_CANCELED,
    MediaJobStatus.MEDIACONVERT_ERROR,
    MediaJobStatus.UNKNOWN,
  ];

  constructor(
    private readonly mrssParser: MRSSParser,
    private readonly episodeRepository: EpisodeRepository,
    private readonly movieRepository: MovieRepository,
    private readonly seriesRepository: SeriesRepository,
    private readonly mediaTranscoder: ITranscoder,
    private readonly httpClient: IHttpClient<Response>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly ingestionRepository: IIngestionRepository,
    private readonly noThumbnailUrl: string,
  ) { }

  private async parseMrss(
    url: string,
    mappingTemplate: MrssMappingTemplate,
    ingestion: Ingestion,
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
  )
    : Promise<Array<Episode | Movie | Series>> {
    try {
      const mrss = await this.mrssParser.fetch(url);
      const results = await this.mrssParser.parse(mrss, mappingTemplate);

      return await this.mrssParser.parsedItemsToAssets(
        this.episodeRepository.getFactory(),
        this.movieRepository.getFactory(),
        this.seriesRepository.getFactory(),
        this.httpClient,
        results,
        provider,
        packages,
        brands,
        distributors,
        locations,
        platforms,
      );
    } catch (e) {
      ingestion.addFailure(`${new Date().toISOString()}: Error while parsing: ${e}`);
      throw e;
    }
  }

  private async storeEpisodeThumbnails(episode: Episode): Promise<void> {
    try {
      const thumbnail = episode.thumbnail.value();
      if (thumbnail !== this.noThumbnailUrl) {
        const pathThumbnail = await this.fileStorage.store(`episodes/${episode.id}`, thumbnail, 'thumbnail');
        await episode.updateThumbnail(pathThumbnail);
      }
    } catch (e) {
      await episode.updateThumbnail(this.noThumbnailUrl);
    }
    try {
      const thumbnail = episode.alternateThumbnail?.value();
      if (thumbnail && thumbnail !== this.noThumbnailUrl) {
        const pathThumbnail = await this.fileStorage.store(`episodes/${episode.id}`, thumbnail, 'alternate-thumbnail');
        await episode.updateAlternateThumbnail(pathThumbnail);
      }
    } catch (e) {
      await episode.updateAlternateThumbnail(this.noThumbnailUrl);
    }
  }

  private async storeThumbnails(
    entity: Movie | Series,
    entityType: string,
    noThumbnail: string,
  ): Promise<void> {
    try {
      const thumbnail = entity.thumbnail.value();
      if (thumbnail !== noThumbnail) {
        const pathThumbnail = await this.fileStorage.store(`${entityType}/${entity.id}`, thumbnail, 'thumbnail');
        await entity.updateThumbnail(pathThumbnail);
      }
    } catch (e) {
      await entity.updateThumbnail(noThumbnail);
    }
    try {
      const thumbnail = entity.alternateThumbnail?.value();
      if (thumbnail && thumbnail !== noThumbnail) {
        const pathThumbnail = await this.fileStorage.store(`${entityType}/${entity.id}`, thumbnail, 'alternate-thumbnail');
        await entity.updateAlternateThumbnail(pathThumbnail);
      }
    } catch (e) {
      await entity.updateAlternateThumbnail(noThumbnail);
    }
    try {
      const thumbnail = entity.backgroundThumbnail?.value();
      if (thumbnail && thumbnail !== noThumbnail) {
        const pathThumbnail = await this.fileStorage.store(`${entityType}/${entity.id}`, thumbnail, 'background-thumbnail');
        await entity.updateBackgroundThumbnail(pathThumbnail);
      }
    } catch (e) {
      await entity.updateBackgroundThumbnail(noThumbnail);
    }
  }

  private activateEntity(
    entity: Movie | Series,
    entityType: string,
    noThumbnail: string,
  ) {
    if (entity.expirationDate !== null && new Date(entity.expirationDate) < new Date()) {
      entity.updateEnabled(false);
    } else if (entity.thumbnail === null || entity.thumbnail.value() === noThumbnail) {
      entity.updateEnabled(false);
    } else {
      entity.updateEnabled(true);
    }
  }

  private async saveEntities(entities: Array<Episode | Movie | Series>): Promise<EntitiesOutput> {
    const output: EntitiesOutput = {
      saved: [],
      notSaved: [],
    };
    const series: Array<Series> = entities.filter(
      (seriesItem) => seriesItem.type === VodType.SERIES,
    ) as Array<Series>;
    const episodes: Array<Episode> = entities.filter(
      (episode) => episode.type === VodType.EPISODE,
    ) as Array<Episode>;
    const movies: Array<Movie> = entities.filter(
      (movie) => movie.type === VodType.MOVIE,
    ) as Array<Movie>;
    // Define containers to save
    const episodesToSave: Array<Episode> = [];
    const seriesToSave: Array<Series> = [];
    const moviesToSave: Array<Movie> = [];

    // Handle series
    const existingSeries = await this.seriesRepository.findMany(series.map((item) => item.id), 'episodes');

    const nonPresentSeries = _.differenceWith(
      series,
      existingSeries,
      (initialSeries, seriesToCompare) => initialSeries.id === seriesToCompare.id,
    );

    existingSeries.forEach((item) => {
      output.notSaved.push(`${item.type}:${item.slug}: Series already exists`);
    });

    await PromisePool
      .for(nonPresentSeries)
      .process(async (seriesItem) => {
        await this.storeThumbnails(seriesItem, 'series', this.noThumbnailUrl);
        this.activateEntity(seriesItem, 'series', this.noThumbnailUrl);
        seriesToSave.push(seriesItem);
        output.saved.push(seriesItem);
      });

    await this.seriesRepository.batchSave(seriesToSave);

    // Find existing episodes
    const existingEpisodes = await this.episodeRepository
      .findMany(episodes.map((episode) => episode.id));

    // Handle existing episodes
    existingEpisodes.forEach((item) => {
      output.notSaved.push(`${item.type}:${item.slug}: Episode already exists`);
    });

    // Get missing episodes from database
    const nonPresentEpisodes = _.differenceWith(
      episodes,
      existingEpisodes,
      (episode, comparedEpisode) => episode.id === comparedEpisode.id,
    );

    const seriesIds = episodes.map((episode) => episode.seriesId);
    const existingSeriesFromEpisodes = await this.seriesRepository.findMany(_.uniq(seriesIds));

    await PromisePool
      .for(nonPresentEpisodes)
      .process(async (episode) => {
        const seriesDatabaseIdx = existingSeriesFromEpisodes
          .findIndex((seriesItem) => seriesItem.id === episode.seriesId);

        // if series already exists in database
        if (seriesDatabaseIdx >= 0) {
          await this.storeEpisodeThumbnails(episode);
          await episode.setSeriesId(existingSeriesFromEpisodes[seriesDatabaseIdx].id);
          episodesToSave.push(episode);
          output.saved.push(episode);
        } else {
          output.notSaved.push(`${episode.type}:${episode.slug}: SeriesId not found`);
        }
      });
    await this.episodeRepository.batchSave(episodesToSave);
    // Update series episodes relations

    // eslint-disable-next-line no-restricted-syntax
    for (const [seriesId, groupedEpisodes] of Object
      .entries(_.groupBy(episodesToSave, (obj) => obj.seriesId))) {
      // eslint-disable-next-line no-await-in-loop
      await this.seriesRepository.appendEpisodes(
        seriesId,
        groupedEpisodes.map((episode) => episode.id),
      );
    }

    const getMovies = await this.movieRepository
      .findMany(movies.map((movie) => movie.id));
    const presentMovies = _.intersectionWith(
      getMovies,
      movies,
      (movie, comparedMovie) => movie.id === comparedMovie.id,
    );
    const nonPresentMovies = _.differenceWith(
      movies,
      getMovies,
      (movie, comparedMovie) => movie.id === comparedMovie.id,
    );
    presentMovies.forEach((movie) => {
      output.notSaved.push(`${movie.type}:${movie.slug}: Movie already exists`);
    });

    await PromisePool
      .for(nonPresentMovies) // Check here
      .process(async (movie) => {
        await this.storeThumbnails(movie, 'movies', this.noThumbnailUrl);
        this.activateEntity(movie, 'movies', this.noThumbnailUrl);
        moviesToSave.push(movie);
        output.saved.push(movie);
      });
    await this.movieRepository.batchSave(moviesToSave);
    return output;
  }

  private async runTranscodingJobs(
    entities: Array<Episode | Movie | Series>,
    ingestion: Ingestion,
    isPrivate: boolean,
    mrssUrl: string,
  )
    : Promise<void> {
    await PromisePool
      .for(entities)
      .process(async (entity) => {
        const content = JSON.parse(entity.contentData);

        switch (entity.type) {
          case VodType.EPISODE:
            if ('asset' in content) {
            // TODO: uncomment on prod
              await this.mediaTranscoder.transcode(ingestion.id, `episodes/${entity.id}`, (content as MrssEpisode).asset.url, mrssUrl, isPrivate, 1, (content as MrssEpisode).cuePoints, (content as MrssEpisode).subtitles);
              ingestion.updateJob(`episodes/${entity.id}`, MediaJobStatus.MEDIACONVERT_SUBMITTED);
            }
            break;
          case VodType.MOVIE:
            if ('asset' in content) {
            // TODO: uncomment on prod
              await this.mediaTranscoder.transcode(ingestion.id, `movies/${entity.id}`, (content as MrssMovie).asset.url, mrssUrl, isPrivate, 1, (content as MrssMovie).cuePoints, (content as MrssMovie).subtitles);
              ingestion.updateJob(`movies/${entity.id}`, MediaJobStatus.MEDIACONVERT_SUBMITTED);
            }
            break;
          default:
        }
      });
    if (ingestion) { await this.ingestionRepository.updateUniqueField<{ [id: string]: MediaJobStatus }>(ingestion, 'jobs', ingestion.jobs); }
  }

  private async createIngestion(mrssUrl: string, ingestionParentId: string): Promise<Ingestion> {
    this.date = new Date();
    const ingestion = await this.ingestionRepository.findByExtId(mrssUrl);

    if (ingestion) {
      console.log('ingestion found');
      await ingestion.setStatus(MrssIngestionStatus.IN_PROGRESS);
      await this.ingestionRepository.updateStatus(ingestion, 'status', ingestion.status);
      return ingestion;
    }

    console.log('ingestion not found');
    const newIngestion = await (
      (this.ingestionRepository.getFactory() as IngestionFactory).toDomain({
        extId: mrssUrl,
        parentId: ingestionParentId,
        status: MrssIngestionStatus.IN_PROGRESS,
        createdAt: this.date.toISOString(),
        updatedAt: this.date.toISOString(),
      }));
    await this.ingestionRepository.save(newIngestion);
    return newIngestion;
  }

  private async updateIngestionSaved(ingestion: Ingestion, entities: EntitiesOutput) {
    await Promise.all(entities.saved.map(
      (entity) => ingestion.addSaved(`${this.date.toISOString()} - ${entity.type} - guid: ${entity.slug} - id: ${entity.id}`),
    ));
    await Promise.all(entities.notSaved.map(
      (failureReason) => ingestion.addFailure(`${this.date.toISOString()}: Mrss Ingestion: ${failureReason}`),
    ));

    await this.ingestionRepository.updateUniqueField<Array<string>>(ingestion, 'saved', ingestion.saved ?? []);
    await this.ingestionRepository.updateUniqueField<Array<string>>(ingestion, 'failures', ingestion.failures ?? []);
    if (entities.saved.length) {
      console.log('update ingestion status');
      await ingestion.setStatus(MrssIngestionStatus.IN_PROGRESS);
      await this.ingestionRepository.updateStatus(ingestion, 'status', MrssIngestionStatus.IN_PROGRESS);
    }
  }

  private getEntitiesToRunTranscoding(
    allEntities: Array<Episode | Movie | Series>,
    savedEntities: Array<Episode | Movie | Series>,
    ingestion: Ingestion,
  ): Array<Episode | Movie | Series> {
    const entitiesForTranscoding = allEntities
      .filter(
        (entity) => {
          const entityJobId = `${entity.type === VodType.EPISODE ? 'episodes' : 'movies'}/${entity.id}`;

          return (entity.type === VodType.EPISODE || entity.type === VodType.MOVIE)
            && !savedEntities.find((savedEntity) => savedEntity.slug === entity.slug)
            && (
              Object.keys(ingestion.jobs).find((jobId) => jobId === entityJobId)
              && IngestVodDomain.retryStatus.includes(ingestion.jobs[entityJobId])
            );
        },
      );

    return [
      ...new Set([
        ...savedEntities,
        ...entitiesForTranscoding,
      ]),
    ];
  }

  async ingestVod(
    mrssUrl: string,
    mappingTemplate: MrssMappingTemplate,
    ingestionParentId: string,
    isPrivate: boolean,
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
  )
    : Promise<Error | undefined> {
    try {
      const ingestion = await this.createIngestion(mrssUrl, ingestionParentId);
      console.log('before toSaveEntities');
      const toSaveEntities = await this.parseMrss(
        mrssUrl,
        mappingTemplate,
        ingestion,
        provider,
        packages,
        brands,
        distributors,
        locations,
        platforms,
      );

      console.log('before saveEntities');
      const entities = await this.saveEntities(toSaveEntities);
      await this.updateIngestionSaved(ingestion, entities);
      entities.saved = this.getEntitiesToRunTranscoding(
        toSaveEntities,
        entities.saved,
        ingestion,
      );

      await this.runTranscodingJobs(entities.saved, ingestion, isPrivate, mrssUrl);
      if (!Object.keys(ingestion.jobs).length) {
        return new Error('Error while running transcoding jobs.');
      }
    } catch (e) {
      return e;
    }
    return undefined;
  }

  async mapUrlPages(mrssUrl: string, mappingTemplate: MrssMappingTemplate): Promise<any> {
    return this.mrssParser.mapUrl(mrssUrl, mappingTemplate);
  }

  async ingestionHandleError(
    mrssUrl: string,
    ingestionParentId: string,
    error: string | undefined,
  ): Promise<void> {
    const ingestion = await this.createIngestion(mrssUrl, ingestionParentId);

    if (error) {
      await ingestion.addFailure(`${this.date.toISOString()}: ${error}`);
    }
    await ingestion.setStatus(MrssIngestionStatus.FAILED);

    await this.ingestionRepository.updateUniqueField<Array<string>>(ingestion, 'failures', ingestion.failures ?? []);
    await this.ingestionRepository.updateStatus(ingestion, 'status', MrssIngestionStatus.FAILED);
  }
}
