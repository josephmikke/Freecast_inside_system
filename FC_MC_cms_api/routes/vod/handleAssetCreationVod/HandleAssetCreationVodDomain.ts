import { EventBridgeEvent } from "aws-lambda";
import { EpisodeDto } from "routes/shared/dto/vod/EpisodeDto";
import { MovieDto } from "routes/shared/dto/vod/MovieDto";
import Provider from "../../provider/shared/Provider";
import {
  StreamFormat,
  StreamProps,
  StreamType,
} from "../../shared/dto/StreamDto";
import {
  AssetCreationVodEvent,
  AssetCreationVodEventParsed,
  MediaJobStatus,
  MrssIngestionStatus,
} from "../../shared/dto/vod/IngestDto";
import Stream from "../../stream/shared/Stream";
import Episode from "../episode/shared/Episode";
import EpisodeFactory from "../episode/shared/EpisodeFactory";
import EpisodeRepository from "../episode/shared/EpisodeRepository";
import { IIngestionRepository } from "../ingestion/shared/IIngestionRepository";
import { IngestionError } from "../ingestion/shared/IngestionError";
import Movie from "../movie/shared/Movie";
import MovieFactory from "../movie/shared/MovieFactory";
import MovieRepository from "../movie/shared/MovieRepository";
import SeriesRepository from "../series/shared/SeriesRepository";
import IAssetCreationDomain from "./IAssetCreatedDomain";

interface IRepository<T, TFact> {
  findOne(id: string): Promise<T | undefined>;
  getFactory(): TFact;
  saveStreamRelation(item: T, stream: Stream): Promise<void>;
  remove(item: T): Promise<boolean>;
  save(series: T): Promise<boolean>;
}

interface IFactory<T, TDto> {
  toPersistence(item: T): TDto;
  toDomain(itemDto: TDto): Promise<T>;
  addStream(streamProps: Array<StreamProps>): Promise<Array<Stream>>;
  handleStreams(
    relationItems: Array<string | StreamProps>
  ): Promise<Array<Stream>>;
  removeStreams(): Promise<void>;
}

interface IEntity {
  streams?: Array<Stream>;
}

interface IDto {
  streams?: Array<string | StreamProps>;
}

export default class AssetCreationDomain implements IAssetCreationDomain {
  constructor(
    private readonly episodeRepository: EpisodeRepository,
    private readonly movieRepository: MovieRepository,
    private readonly assetsUrl: string,
    private readonly ingestionRepository: IIngestionRepository,
    private readonly seriesRepository: SeriesRepository,
  ) {}

  private static vastTags: {
    [provider: string]: { preroll?: string; midroll: string };
  } = {
    crackle: {
      preroll: process.env.CRACKLE_PREROLL!,
      midroll: process.env.CRACKLE_VASTID!,
    },
    popcornflix: {
      preroll: process.env.POPCORN_PREROLL!,
      midroll: process.env.POPCORN_VASTID!,
    },
    "go-see-tv": {
      midroll: process.env.GOSEE_VASTID!,
    },
    electricnow: {
      midroll: process.env.ELECTRICNOW_VASTID!,
    },
    "best-ever-channels": {
      midroll: process.env.BEC_VASTID!,
    },
    maverick: {
      midroll: process.env.MAVERICK_VASTID!,
    },
    insp: {
      midroll: process.env.INSP_VASTID!,
    },
    "axs-tv-now": {
      midroll: process.env.AXSTV_VASTID!,
    },
    pursuit: {
      midroll: process.env.PURSUIT_VASTID!,
    },
    // "": "ENTREPRENEUR_VASTID",
    // "": "QUESTAR_VASTID",
  };

  async setEntityStream(
    entityId: string,
    type: string,
    packageConf: string,
    manifestUrls: Array<string>
  ): Promise<void> {
    let format: StreamFormat = StreamFormat.HLS;
    let provider:Provider | undefined;
    if (type === "movies" || type === "movie") {
      const movie = await this.movieRepository.findOne(entityId);
      provider = movie?.provider;
    } else {
      const episode = await this.episodeRepository.findOne(entityId);
      const series = await this.seriesRepository.findOne(episode?.seriesId!);
      provider = series?.provider;
    }
    
    const setStreamMethod = async (streamProps: Array<StreamProps>) => {
      console.log("setStreamMethod", streamProps);
      if (type === "movies" || type === "movie") {
        await AssetCreationDomain.saveEntityStream<
          Movie,
          MovieDto,
          MovieFactory,
          MovieRepository
        >(type, entityId, streamProps, this.movieRepository);
      } else {
        await AssetCreationDomain.saveEntityStream<
          Episode,
          EpisodeDto,
          EpisodeFactory,
          EpisodeRepository
        >(
          type,
          entityId,
          streamProps,
          this.episodeRepository
        );
      }
    };

    const stageSuffix = (process.env.ENV ?? "").toUpperCase();
    const hlsPackageName = process.env[`HLS_PACKAGE_NAME_${stageSuffix}`];
    const hlsDrmPackageName = process.env[`HLS_DRM_PACKAGE_NAME_${stageSuffix}`];
    const dashPackageName = process.env[`DASH_PACKAGE_NAME_${stageSuffix}`];
    const dashDrmPackageName = process.env[`DASH_DRM_PACKAGE_NAME_${stageSuffix}`];

    if (packageConf === hlsDrmPackageName) {
      format = StreamFormat.HLS_DRM;
    } else if (packageConf === hlsPackageName) {
      format = StreamFormat.HLS;
    } else if (packageConf === dashDrmPackageName) {
      format = StreamFormat.DASH_DRM;
    } else if (packageConf === dashPackageName) {
      format = StreamFormat.DASH;
    } else {
      console.warn(
        `[setEntityStream] Unknown packaging configuration "${packageConf}" for stage "${process.env.ENV}". Falling back to format=${format}. Expected one of: ${[hlsPackageName, hlsDrmPackageName, dashPackageName, dashDrmPackageName].filter(Boolean).join(", ")}`
      );
    }

    await setStreamMethod(
      manifestUrls.map((url) => {
        const name = `${type}-${entityId}-${format}-${Date.now()}`;

        return {
          name,
          extId: name,
          type: StreamType.STREAM,
          format,
          data: url.replace(/https:\/\/.+\.amazonaws.com/, this.assetsUrl),
          daiParams: false,
          weight: 0,
          enabled: false
        };
      })
    );

    await setStreamMethod(
      manifestUrls.map((url) => {
        const name = `${type}_ssai-${entityId}-${format}-${Date.now()}`;
        const isHls = format.includes("HLS");

        let hlsPrefix, dashPrefix, initialUrl = "";

        if(process.env.MEDIATAILOR_HLS_PREFIX_URL && process.env.MEDIATAILOR_DASH_PREFIX_URL) {
          hlsPrefix = process.env.MEDIATAILOR_HLS_PREFIX_URL.split(".com")[1];
          dashPrefix = process.env.MEDIATAILOR_DASH_PREFIX_URL.split(".com")[1];
        }

        const cdnPrefix = isHls && provider?.hlsMtSlug
          ? process.env.HLS_VOD_TAILOR_PREFIX
          : process.env.VOD_TAILOR_PREFIX;

        if (cdnPrefix) {
          initialUrl = url.replace(/https:\/\/.+\.amazonaws.com/, cdnPrefix);
        }

        const ssaiUrlPostfix = `${isHls ? hlsPrefix : dashPrefix}out/v1/`;
        const ssaiUrl = (initialUrl && ssaiUrlPostfix) ? initialUrl.split("/out/v1/").join(ssaiUrlPostfix) : "";

        const slug = isHls
          ? (provider?.hlsMtSlug || provider?.mtSlug)
          : provider?.mtSlug;

        const streamInfo = {
          name,
          extId: name,
          type: StreamType.STREAM,
          format,
          data: slug ? ssaiUrl.replace(`${process.env.ENV}-vod`, slug) : ssaiUrl,
          daiParams: true,
          weight: 0,
          enabled: true
        };

        return streamInfo;
      })
    );
  }

  static readonly VOD_TYPE_TOKENS = ["episodes", "movies", "episode", "movie"];

  parseEvent(
    event: EventBridgeEvent<string, AssetCreationVodEvent>
  ): AssetCreationVodEventParsed {
    const empty: AssetCreationVodEventParsed = {
      ingestionId: "",
      type: "",
      entityId: "",
    };

    const assetResource = event.resources.find((resource: string) =>
      resource.includes(":assets/")
    );
    if (!assetResource) return empty;

    const assetId = assetResource.split(":assets/")[1];
    if (!assetId) return empty;

    const parts = assetId.split("_");
    const typeIndex = parts.findIndex((part) =>
      AssetCreationDomain.VOD_TYPE_TOKENS.includes(part)
    );

    if (typeIndex < 1 || typeIndex + 1 >= parts.length) return empty;

    const jobIdPattern = /^\d{13}-\w+$/;
    const lastPart = parts[parts.length - 1];
    const entityEnd = jobIdPattern.test(lastPart) ? parts.length - 1 : parts.length;
    const entityId = parts.slice(typeIndex + 1, entityEnd).join("_");

    if (!entityId) return empty;

    return {
      ingestionId: parts[typeIndex - 1],
      type: parts[typeIndex],
      entityId,
    };
  }

  private static buildSearchParams(
    stream: StreamProps,
    provider?: Provider
  ): StreamProps {
    if (!provider) return stream;
    console.log("midroll", this.vastTags[provider.extId].midroll);
    console.log("preroll", this.vastTags[provider.extId].preroll);
    const url = new URL(stream.data);
    if (this.vastTags[provider.extId].midroll) {
      url.searchParams.append(
        "ads.vastId",
        this.vastTags[provider.extId].midroll
      );
    }
    if (this.vastTags[provider.extId].preroll) {
      url.searchParams.append(
        "ads.preroll",
        this.vastTags[provider.extId].preroll!
      );
    }
    return {
      ...stream,
      data: url.href,
    };
  }

  private static async saveEntityStream<
    T extends IEntity,
    TDto extends IDto,
    TFact extends IFactory<T, TDto>,
    TRepo extends IRepository<T, TFact>
  >(
    type: string,
    id: string,
    streamObjects: Array<StreamProps>,
    repository: TRepo,
  ): Promise<void> {
    const factory = await repository.getFactory();
    const entity = await repository.findOne(id);

    if (!entity) throw new Error(`${type} ${id} not found.`);
    try {
     
      const streams = await factory.addStream(streamObjects);
      await Promise.all(
        streams.map(async (stream: Stream) =>
          repository.saveStreamRelation(entity, stream)
        )
      );
    } catch (err) {
      console.log(err);
      throw new Error(`Error when saving ${type} ${id} ${err}`);
    }
  }

  async updateJobStatus(
    ingestionId: string,
    entityId: string,
    status: MediaJobStatus,
    error?: string
  ) {
    const ingestion = await this.ingestionRepository.findOne(ingestionId);

    if (!ingestion)
      throw new IngestionError.IngestionNotFound(`id: ${ingestionId}`);

    await this.ingestionRepository.updateJobField(ingestion, entityId, status);

    if (status === MediaJobStatus.MEDIAPACKAGE_ERROR) {
      await ingestion.addFailure(
        `${new Date().toISOString()}: Transcoding Error: ${entityId}: ${error}`
      );
      await this.ingestionRepository.updateUniqueField<Array<string>>(
        ingestion,
        "failures",
        ingestion.failures ?? []
      );
    }
  }

  async updateIngestionStatus(ingestionId: string) {
    const ingestion = await this.ingestionRepository.findOne(ingestionId);

    if (!ingestion)
      throw new IngestionError.IngestionNotFound(`id: ${ingestionId}`);
    if (await ingestion.isIngestionCompleted()) {
      await this.ingestionRepository.updateStatus(
        ingestion,
        "status",
        MrssIngestionStatus.COMPLETED
      );
    } else if (await ingestion.isIngestionFailed()) {
      await this.ingestionRepository.updateStatus(
        ingestion,
        "status",
        MrssIngestionStatus.FAILED
      );
    }
  }
}
