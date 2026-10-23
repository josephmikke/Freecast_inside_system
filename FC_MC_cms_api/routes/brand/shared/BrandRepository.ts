import { IHttpClient } from '../../epg/shared/IHttpClient';
import { BrandDto, BrandResponseDto } from '../../shared/dto/BrandDto';

import Brand from './Brand';
import { BrandError } from './BrandError';
import { IBrandRepository } from './IBrandRepository';

export default class BrandRepository implements IBrandRepository {
  constructor(
    private readonly httpClient: IHttpClient<Response>,
    private readonly baseUrl: string,
  ) {}

  private async getBrandsHttp(url: string | null): Promise<Brand[]> {
    try {
      if (url === null) return [];
      const response = await this.httpClient.get(url);
      const brandsResponse: BrandResponseDto = await response.json();

      return [
        ...brandsResponse.results.map((brandDto: BrandDto) => Brand.create(brandDto)),
        ...(await this.getBrandsHttp(brandsResponse.next)),
      ];
    } catch (err) {
      throw new BrandError.BrandUnexpectedError(err);
    }
  }

  async findAll(): Promise<Brand[]> {
    try {
      return await this.getBrandsHttp(`${this.baseUrl}?page=1&page_size=200`);
    } catch (e) {
      throw new BrandError.BrandUnexpectedError(e);
    }
  }

  async findMany(ids: number[] | string[]): Promise<Brand[]> {
    try {
      const brands = await this.findAll();
      const idsNumber = ids.map((id) => (typeof id === 'string' ? Number(id) : id));
      const items = brands.filter((brand) => idsNumber.includes(brand.siteId));

      return items;
    } catch (e) {
      switch (true) {
        case e instanceof BrandError.BrandNotFound:
          throw e;

        default:
          throw new BrandError.BrandUnexpectedError(e);
      }
    }
  }

  async findOne(id: number): Promise<Brand | undefined> {
    try {
      const brands = await this.findAll();

      return brands.find((brand) => brand.siteId === id);
    } catch (e) {
      throw new BrandError.BrandUnexpectedError(e);
    }
  }
}
