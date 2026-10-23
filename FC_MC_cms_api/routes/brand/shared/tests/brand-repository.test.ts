import { Response } from 'cross-fetch';

import { IHttpClient } from '../../../epg/shared/IHttpClient';
import { BrandDto, BrandResponseDto } from '../../../shared/dto/BrandDto';
import BrandRepository from '../BrandRepository';

const BASE_URL = 'https://api-services.freecast.com/branding/api/v0/brands/';
const PAGE_1 = `${BASE_URL}?page=1&page_size=200`;
const PAGE_2 = `${BASE_URL}?page=2&page_size=200`;

const brandDto = (siteId: number): BrandDto => ({
  slug: `brand-${siteId}`,
  name: `Brand ${siteId}`,
  domain: `brand-${siteId}.com`,
  active: true,
  site_id: siteId,
  logo_image: '',
  logo_image_dark: '',
});

/**
 * Serves the brands API from fixtures instead of the live api-services.freecast.com endpoint,
 * which is slow and times out intermittently. Split over two pages to exercise `next` handling.
 */
class FixtureHttpClient implements IHttpClient<Response> {
  private readonly pages: Record<string, BrandResponseDto> = {
    [PAGE_1]: {
      count: 3, next: PAGE_2, previous: null, results: [brandDto(118), brandDto(131)],
    },
    [PAGE_2]: {
      count: 3, next: null, previous: PAGE_1, results: [brandDto(237)],
    },
  };

  async get(url: string): Promise<Response> {
    const page = this.pages[url];
    if (!page) throw new Error(`Unexpected brand URL: ${url}`);
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
}

const repository = new BrandRepository(new FixtureHttpClient(), BASE_URL);

describe('Brand Repository', () => {
  const existingIds = [118, 131, 237];
  const nonExistingIds = [-1, -2, -3];

  it('Should find all brands', async () => {
    const brands = await repository.findAll();

    expect(brands.map((brand) => brand.siteId)).toEqual(existingIds);
  });

  it('Should find many brands', async () => {
    const brands = await repository.findMany(existingIds);

    expect(brands.length).toEqual(existingIds.length);
  });

  it('Should not findMany brands', async () => {
    const brands = await repository.findMany(nonExistingIds);

    expect(brands.length).not.toEqual(nonExistingIds.length);
  });

  it('Should find brand', async () => {
    const brand = await repository.findOne(existingIds[0]);

    expect(brand).toBeDefined();
  });

  it('Should not find brand', async () => {
    const brand = await repository.findOne(nonExistingIds[0]);

    expect(brand).toBeUndefined();
  });
});
