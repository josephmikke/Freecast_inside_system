import { MrssMappingTemplate } from '../../shared/dto/MrssDto';

export interface IIngestVodDomain {
  ingestVod(
    mrssUrl: string,
    mappingTemplate: MrssMappingTemplate,
    isPrivate: boolean,
    provider: string,
    packages: Array<string>,
    brands: Array<string>,
    distributors: Array<string>,
    locations: Array<string>,
    platforms: Array<string>,
  ): Promise<boolean>
}
