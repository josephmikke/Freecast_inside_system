import { MrssMappingTemplate } from '../../shared/dto/MrssDto';

export interface IIngestVodDomain {
  ingestVod(
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
  ): Promise<Error | undefined>
  mapUrlPages(mrssUrl: string, mappingTemplate: MrssMappingTemplate): Promise<any>
  ingestionHandleError(
    mrssUrl: string,
    ingestionParentId: string,
    error: string | undefined
  ): Promise<void>
}
