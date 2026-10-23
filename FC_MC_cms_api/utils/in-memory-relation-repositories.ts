// eslint-disable-next-line max-classes-per-file
import Brand from '../routes/brand/shared/Brand';
import { IBrandRepository } from '../routes/brand/shared/IBrandRepository';
import Distributor from '../routes/distributor/shared/Distributor';
import { DistributorError } from '../routes/distributor/shared/DistributorError';
import { IDistributorRepository } from '../routes/distributor/shared/IDistributorRepository';

/**
 * In-memory stand-ins for the brand and distributor repositories, which otherwise call the
 * live api-services.freecast.com endpoints. Those calls are slow and time out intermittently,
 * failing unrelated tests. Seeded with the ids the test suites reference.
 */

export const TEST_BRAND_IDS = [118, 131, 237];
export const TEST_DISTRIBUTOR_IDS = [13, 28, 36];

export class InMemoryBrandRepository implements IBrandRepository {
  private readonly brands = TEST_BRAND_IDS.map((siteId) => Brand.create({
    slug: `brand-${siteId}`,
    name: `Brand ${siteId}`,
    domain: `brand-${siteId}.com`,
    active: true,
    site_id: siteId,
    logo_image: '',
    logo_image_dark: '',
  }));

  async findAll(): Promise<Brand[]> {
    return this.brands;
  }

  // Mirrors BrandRepository: unknown ids are filtered out rather than rejected.
  async findMany(ids: number[] | string[]): Promise<Brand[]> {
    const idsNumber = ids.map(Number);
    return this.brands.filter((brand) => idsNumber.includes(brand.siteId));
  }

  async findOne(id: number): Promise<Brand | undefined> {
    return this.brands.find((brand) => brand.siteId === id);
  }
}

export class InMemoryDistributorRepository implements IDistributorRepository {
  private readonly distributors = TEST_DISTRIBUTOR_IDS.map((id) => Distributor.create({
    id,
    name: `Distributor ${id}`,
    code: `distributor-${id}`,
    type: null,
    custom_affiliate_tags: [],
  }));

  async findAll(): Promise<Distributor[]> {
    return this.distributors;
  }

  // Mirrors DistributorRepository: any unknown id (a 404 upstream) rejects the whole lookup.
  async findMany(ids: number[] | string[]): Promise<Distributor[]> {
    return Promise.all(ids.map((id) => this.findOne(Number(id)) as Promise<Distributor>));
  }

  async findOne(id: number): Promise<Distributor | undefined> {
    const distributor = this.distributors.find((item) => item.id === id);
    if (!distributor) throw new DistributorError.DistributorNotFound();
    return distributor;
  }
}
