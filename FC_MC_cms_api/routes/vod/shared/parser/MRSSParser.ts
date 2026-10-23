import { PromisePool } from '@supercharge/promise-pool';

import drainResponse from '../../../epg/shared/drainResponse';
import { IHttpClient } from '../../../epg/shared/IHttpClient';
import { GenericObject, IAsyncParser } from '../../../epg/shared/IParser';
import {
  MrssEpisode,
  MrssMappingTemplate,
  MrssMovie,
  MrssSeries,
  MrssType,
} from '../../../shared/dto/MrssDto';
import Episode from '../../episode/shared/Episode';
import Movie from '../../movie/shared/Movie';
import Series from '../../series/shared/Series';
import { IImageAdaptor } from '../imageAdaptor/IImageAdaptor';
import ImageAdaptor from '../imageAdaptor/ImageAdaptor';

import { IMrssPath } from './IMrssPath';
import { MRSSError } from './MRSSError';
import MrssFactory from './MrssFactory';

type VodFactory = {
  ingestToDomain(
    asset: MrssMovie | MrssEpisode | MrssSeries,
    imageAdaptor: IImageAdaptor,
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>
  ): Promise<Episode | Series | Movie>;
};

export default class MRSSParser extends MrssFactory
  implements IAsyncParser<GenericObject, any> {
  private imageAdaptor;

  constructor(
    private readonly httpClient: IHttpClient<Response>,
    mrssPath: IMrssPath<GenericObject>,
  ) {
    super(mrssPath);
    this.imageAdaptor = new ImageAdaptor(httpClient);
  }

  async parsedItemsToAssets(
    episodeFactory: VodFactory,
    movieFactory: VodFactory,
    seriesFactory: VodFactory,
    httpClient: IHttpClient<Response>,
    items: Array<MrssMovie | MrssEpisode | MrssSeries>,
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
  ): Promise<Array<Episode | Series | Movie>> {
    console.log('parsedItemsToAssets');
    const { results } = await PromisePool
      .for(items)
      .process(async (item) => {
        switch (item.type) {
          case MrssType.SERIES:
            return seriesFactory.ingestToDomain(
              item as MrssSeries,
              this.imageAdaptor,
              provider,
              packages,
              brands,
              distributors,
              locations,
              platforms,
            );
          case MrssType.EPISODE:
            return episodeFactory.ingestToDomain(
              item as MrssEpisode,
              this.imageAdaptor,
            );
          default:
            return movieFactory.ingestToDomain(
              item as MrssMovie,
              this.imageAdaptor,
              provider,
              packages,
              brands,
              distributors,
              locations,
              platforms,
            );
        }
      });
    console.log('after MRSSParser');
    return results;
  }

  async fetch(url: string): Promise<GenericObject> {
    try {
      const response = await this.httpClient.get(url);
      if (response.status >= 204) {
        await drainResponse(response);
        throw new MRSSError.UnableToFetchMrss(response.statusText);
      }
      return { value: await response.text() };
    } catch (e) {
      throw new MRSSError.UnableToFetchMrss(e);
    }
  }

  async parse(payload: GenericObject, mappingTemplate: MrssMappingTemplate): Promise<any> {
    try {
      const items: Array<GenericObject> = await this.mrssPath
        .toXMlObject(payload.value, mappingTemplate.root);

      const parseItem = (item: GenericObject) => {
        switch (this.mrssPath.select(item, mappingTemplate.type)) {
          case MrssType.SERIES:
            return this.createSeries(item, mappingTemplate);

          case MrssType.EPISODE:
            return this.createEpisode(item, mappingTemplate);

          default:
            return this.createMovie(item, mappingTemplate);
        }
      };

      return items.map(parseItem);
    } catch (e) {
      if (e instanceof MRSSError.UnableToParse) { throw e; }
      throw new MRSSError.UnableToParse(e);
    }
  }

  async mapUrl(url: string, mappingTemplate: MrssMappingTemplate): Promise<any> {
    try {
      if (mappingTemplate.nextPage !== '') {
        const payload = await this.fetch(url);

        const items: Array<GenericObject> = await this.mrssPath
          .toXMlObject(payload.value, mappingTemplate.nextPage);

        if (items.length) {
          return [
            url,
            ...(await this.mapUrl(items[0] as unknown as string, mappingTemplate)),
          ];
        }
      }
      return [url];
    } catch (e) {
      if (e instanceof MRSSError.UnableToParse) { throw e; }
      throw new MRSSError.UnableToParse(e);
    }
  }
}
