import { EPGProgramsParameters } from 'routes/shared/dto/EPGDto';

import Genre from '../../asset/shared/Genre';
import Stream from '../../stream/shared/Stream';
import Brand from '../../brand/shared/Brand';
import StreamFactory from '../../stream/shared/StreamFactory';
import { StreamProps } from '../../shared/dto/StreamDto';
import { IBrandRepository } from '../../brand/shared/IBrandRepository';
import Category from '../../category/shared/Category';
import { ICategoryRepository } from '../../category/shared/ICategoryRepository';
import { IStreamRepository } from '../../stream/shared/IStreamRepository';
import Distributor from '../../distributor/shared/Distributor';
import { IDistributorRepository } from '../../distributor/shared/IDistributorRepository';
import { IEPGRepository } from '../../epg/shared/IEPGRepository';
import { IGenreRepository } from '../../genre/shared/IGenreRepository';
import { ILocationRepository } from '../../location/shared/ILocationRepository';
import Location from '../../location/shared/Location';
import { IPackageRepository } from '../../package/shared/IPackageRepository';
import Package from '../../package/shared/Package';
import { IPlatformRepository } from '../../platform/shared/IPlatformRepository';
import Platform from '../../platform/shared/Platform';
import { IProviderRepository } from '../../provider/shared/IProviderRepository';
import { ChannelDto, ChannelRequestDto, WeightRelation } from '../../shared/dto/ChannelDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import MediaPackageId from '../../shared/valueObjects/MediaPackageId';

import Channel, { ROOT_ENTITY } from './Channel';
import { ChannelError } from './ChannelError';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

type AssetWithName = Platform | Category | Package | Genre | Location | Distributor | Brand;
type Repository = {
  findMany(ids: Array<string>): Promise<Array<AssetWithName>>
};

export default class ChannelFactory implements IFactory<Channel, ChannelRequestDto, ChannelDto> {
  private readonly uid: UID;

  private readonly streamFactory: StreamFactory;

  private createdStream: Array<Stream> = [];

  private weightRelations:
  Map<string, Array<WeightRelation>> = new Map<string, Array<WeightRelation>>();

  static WEIGHT_RELATIONS = ['categories'];

  static BRANDS_KEY = 'brands';

  static readonly sortByName = (a: AssetWithName, b: AssetWithName) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };

  constructor(
    uid: UID,
    private readonly providerRepository: IProviderRepository,
    private readonly epgRepository: IEPGRepository,
    private readonly platformRepository: IPlatformRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly packageRepository: IPackageRepository,
    private readonly genreRepository: IGenreRepository,
    private readonly locationRepository: ILocationRepository,
    private readonly streamRepository: IStreamRepository,
    private readonly distributorRepository: IDistributorRepository,
    private readonly brandRepository: IBrandRepository,
  ) {
    this.uid = uid;
    this.streamFactory = new StreamFactory(uid);
  }

  public async removeStreams() {
    await Promise.all(this.createdStream.map(async (stream) => {
      if (!(await this.streamRepository.hasRelationships(stream))) {
        await this.streamRepository.remove(stream);
      }
    }));
  }

  private async handleRelations(
    relation: string,
    relationIds: Array<string | WeightRelation> | undefined,
    relationRepository: Repository,
  ) {
    if (!relationIds?.length) {
      return [];
    }

    const relationItems = await relationRepository.findMany(
      relationIds.map((relationId: string | WeightRelation) => {
        if (typeof relationId !== 'string') {
          this.weightRelations.set(relation, [
            ...(this.weightRelations.get(relation) ?? []),
            relationId,
          ]);
          return relationId.id;
        }
        if (ChannelFactory.WEIGHT_RELATIONS.includes(relation)) {
          this.weightRelations.set(relation, [
            ...(this.weightRelations.get(relation) ?? []),
            { id: relationId },
          ]);
        }
        return relationId;
      }),
    );

    if (relation !== ChannelFactory.BRANDS_KEY && relationItems.length !== relationIds.length) {
      throw new ChannelError.UnknownChannelDependency(relation);
    }
    return relationItems.sort(ChannelFactory.sortByName);
  }

  private async handleStreams(relationItems: Array<string | StreamProps>) {
    if (!relationItems?.length) {
      return [];
    }

    const existingStreams = (relationItems.filter((stream: string | StreamProps) => typeof stream === 'string') as Array<string>);
    const newStreams = await Promise.all(
      (relationItems.filter((stream: string | StreamProps) => typeof stream !== 'string') as Array<StreamProps>)
        .map(async (stream: StreamProps) => {
          const streamItem = await this.streamFactory.toDomain({
            ...stream,
          });

          if (
            !(await this.streamRepository.exists(streamItem))
            && (await this.streamRepository.findOne(streamItem.id)) === undefined
          ) {
            this.createdStream.push(streamItem);
            await this.streamRepository.save(streamItem);
          } else {
            throw new ChannelError.ChannelStreamCreation('Stream exitId or id already taken');
          }
          return streamItem;
        }) ?? [],
    );

    const streams = await [
      ...(existingStreams.length ? await this.streamRepository.findMany(existingStreams) : []),
      ...newStreams,
    ];

    if (relationItems.length !== streams.length) {
      throw new ChannelError.ChannelStreamCreation();
    }
    return streams.sort(ChannelFactory.sortByName);
  }

  private async updateRelationsWeight(channel: Channel) {
    const categoriesRelations = await this.categoryRepository
      .getParentRelationships(ROOT_ENTITY, channel.id);

    await channel.setCategoriesWeight(
      await categoriesRelations.map((relation) => ({
        id: relation.id,
        weight: relation.weight,
      })),
    );
    await channel.updateRelationsWeight();
  }

  static haveUnknownBrands(brands: Array<Brand>, expectedIds: Array<string>): boolean {
    const knownBrands: Array<string> = [...new Set(brands.map((brand) => `${brand.siteId}`))];
    return knownBrands.length < expectedIds.length;
  }

  /**
   * `validateMediaPackageId` is opt-in because DescribeChannel is quota limited: read paths
   * hydrate every channel of a listing through here, and validating each one turned a single
   * GET into N throttled API calls whose throttles surfaced as "MediaPackageId is invalid".
   * Ids already persisted were validated on the write that stored them, so only writes ask.
   */
  async toDomain(
    raw: ChannelDto,
    programsFilters?: EPGProgramsParameters,
    validateMediaPackageId = false,
  ): Promise<Channel> {
    const channelId = raw.id || this.uid.generate(8);
    const channel = Channel.create({
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      extId: raw.extId ?? '',
      vastId: raw.vastId ?? '',
      expirationDate: raw.expirationDate ?? '',
      exclude: raw.exclude ?? '',
      enabled: raw.enabled ?? true,
      epg: raw.epg ?? '',
      ...raw,
      mediapackageId: new MediaPackageId(raw.mediapackageId ?? ''),
    }, channelId);

    if (validateMediaPackageId) await (channel.mediapackageId as MediaPackageId).isValid();
    this.createdStream = [];
    const excludedAttr = raw.exclude?.split(',') ?? [];

    if (!Channel.isRelationExcluded('provider', excludedAttr)) {
      channel.provider = await this.providerRepository.findOne(raw.provider);
      if (channel.provider === undefined) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: provider id=${raw.provider}`);
    }

    if (!Channel.isRelationExcluded('epg', excludedAttr) && raw.epg && raw.epg !== '') {
      channel.epg = await this.epgRepository.findOne(raw.epg, programsFilters);
      if (channel.epg === undefined) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: epg id=${raw.epg}`);
    }

    if (!Channel.isRelationExcluded('platforms', excludedAttr)) channel.platforms = await this.handleRelations('platforms', raw.platforms, this.platformRepository) as Array<Platform>;
    if (!Channel.isRelationExcluded('categories', excludedAttr)) channel.categories = await this.handleRelations('categories', raw.categories, this.categoryRepository) as Array<Category>;
    channel.setCategoriesWeight(this.weightRelations.get('categories') ?? []); // when saving channel
    if (!Channel.isRelationExcluded('packages', excludedAttr)) channel.packages = await this.handleRelations('packages', raw.packages, this.packageRepository) as Array<Package>;
    if (!Channel.isRelationExcluded('genres', excludedAttr)) channel.genres = await this.handleRelations('genres', raw.genres, this.genreRepository) as Array<Genre>;
    if (!Channel.isRelationExcluded('locations', excludedAttr)) channel.locations = await this.handleRelations('locations', raw.locations, this.locationRepository) as Array<Location>;
    if (!Channel.isRelationExcluded('distributors', excludedAttr)) channel.distributors = await this.handleRelations('distributors', raw.distributors?.map((id) => id.toString()), this.distributorRepository) as Array<Distributor>;
    if (!Channel.isRelationExcluded('brands', excludedAttr)) channel.brands = await this.handleRelations('brands', raw.brands?.map((id) => id.toString()), this.brandRepository) as Array<Brand>;

    if (!Channel.isRelationExcluded('categories', excludedAttr) && !channel.categories?.length) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: categories`);
    if (!Channel.isRelationExcluded('packages', excludedAttr) && !channel.packages?.length) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: packages`);
    if (!Channel.isRelationExcluded('brands', excludedAttr) && ChannelFactory.haveUnknownBrands(channel.brands ?? [], raw.brands?.map((id) => id.toString()) ?? [])) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: brands`);

    try {
      if (!Channel.isRelationExcluded('streams', excludedAttr)) channel.streams = await this.handleStreams(raw.streams ?? []);
    } catch (e) {
      await this.removeStreams();
      throw e;
    }
    if (!Channel.isRelationExcluded('streams', excludedAttr) && !channel.streams?.length) throw new ChannelError.UnknownChannelDependency(`on channel id=${channelId}: streams`);

    await this.updateRelationsWeight(channel);
    delete channel.categoriesWeight;
    this.weightRelations.clear();
    return channel;
  }

  toPersistence(raw: Channel): ChannelDto {
    return {
      ...raw,
      thumbnail: raw.thumbnail.value(),
      mediapackageId: raw.mediapackageId.value(),
      provider: raw.provider?.id ?? '',
      epg: raw.epg?.id ?? '',
      platforms: Array.from(raw.platforms ?? []).map((platform) => platform.id),
      categories: Array.from(raw.categories ?? []).map((category) => category.id),
      packages: Array.from(raw.packages ?? []).map((packageItem) => packageItem.id),
      genres: Array.from(raw.genres ?? []).map((genre) => genre.id),
      locations: Array.from(raw.locations ?? []).map((location) => location.id),
      streams: Array.from(raw.streams ?? []).map((stream) => stream.id),
      distributors: Array.from(raw.distributors ?? []).map((distributor) => `${distributor.id}`),
      brands: [...new Set(Array.from(raw.brands ?? []).map((brand) => `${brand.siteId}`))],
    };
  }
}
