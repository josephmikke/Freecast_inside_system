import { Context } from 'aws-lambda';

import { IngestVodInput, IngestVodState } from '../../shared/dto/vod/IngestDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IIngestVodDomain } from './IIngestVodDomain';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class ApiGatewayAdaptor implements
  IInvoker<IngestVodInput, Context, any> {
  private readonly domain: IIngestVodDomain;

  private readonly uid: UID;

  constructor(domain: IIngestVodDomain, uid: UID) {
    this.domain = domain;
    this.uid = uid;
  }

  async handler(event: IngestVodInput, _context?: Context): Promise<any> {
    try {
      const {
        type,
        url,
        mapping,
        ingestionParentId,
        isPrivate,
        provider,
        packages,
        error,
        brands,
        distributors,
        locations,
        platforms,
      } = event;
      let status;

      switch (type) {
        case IngestVodState.MAP_URL:
          return {
            type: IngestVodState.INGEST,
            url: await this.domain.mapUrlPages(url, mapping),
            mapping,
            ingestionParentId: this.uid.generate(8),
            isPrivate,
            provider,
            packages,
            brands,
            distributors,
            locations,
            platforms,
          };
        case IngestVodState.INGEST:
          status = await this.domain.ingestVod(
            url,
            mapping,
            ingestionParentId,
            isPrivate ?? false,
            provider,
            packages,
            brands,
            distributors,
            locations,
            platforms,
          );
          if (status !== undefined) {
            return {
              type: IngestVodState.FAILURE,
              url,
              mapping,
              ingestionParentId,
              isPrivate,
              provider,
              packages,
              brands,
              distributors,
              locations,
              platforms,
              error: `${status}`,
            };
          }
          return {
            type: IngestVodState.DONE,
            ingestionParentId,
          };
        case IngestVodState.FAILURE:
          await this.domain.ingestionHandleError(url, ingestionParentId, error);
          return {
            type: IngestVodState.DONE,
            ingestionParentId,
          };
        case IngestVodState.DONE:
        default:
          console.log(event);
      }
      return {};
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: `${e}`,
          };
      }
    }
  }
}
