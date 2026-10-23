import { Response } from 'cross-fetch';

import { IHttpClient } from '../../../epg/shared/IHttpClient';
import { DistributorDto } from '../../../shared/dto/DistributorDto';
import Distributor from '../Distributor';
import { DistributorError } from '../DistributorError';
import DistributorRepository from '../DistributorRepository';

const BASE_URL = 'https://api-services.freecast.com/affiliates/api/distributors/';

const DISTRIBUTOR_ID_TYPE_NOT_NULL = 17;

const distributorDto = (id: number): DistributorDto => ({
  id,
  name: `Distributor ${id}`,
  code: `DIST${id}`,
  type: id === DISTRIBUTOR_ID_TYPE_NOT_NULL
    ? { name: `Distributor ${id}`, slug: `DIST${id}`, payout_flag: true }
    : null,
  custom_affiliate_tags: [],
});

/**
 * Serves the distributors API from fixtures instead of the live api-services.freecast.com
 * endpoint, which is slow and whose data changes underneath the tests (ids once missing
 * upstream now exist). Unknown numeric ids get a 404 like the real API; anything else gets
 * a non-JSON 400 so the repository hits its unexpected-error path.
 */
class FixtureHttpClient implements IHttpClient<Response> {
  private readonly distributors: Record<number, DistributorDto> = {
    13: {
      id: 13,
      name: 'Test Dist55',
      code: 'DIST01',
      type: null,
      custom_affiliate_tags: [{
        id: 50,
        affiliate: 'Test affiliate',
        custom_affiliate_tag: '?tag=123',
        custom_affiliate_url: 'https://www.ttt.philo3.com',
      }],
    },
    17: distributorDto(17),
    28: distributorDto(28),
    36: distributorDto(36),
  };

  async get(url: string): Promise<Response> {
    if (url === BASE_URL) return FixtureHttpClient.json(Object.values(this.distributors));

    const id = url.slice(BASE_URL.length).replace(/\/$/, '');
    if (!/^-?\d+$/.test(id)) return new Response('Bad Request', { status: 400 });

    const distributor = this.distributors[Number(id)];
    return distributor
      ? FixtureHttpClient.json(distributor)
      : FixtureHttpClient.json({ detail: 'Not found.' }, 404);
  }

  private static json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
}

const repository = new DistributorRepository(new FixtureHttpClient(), BASE_URL);

describe('Distributor Repository', () => {
  let distributorTypeNull: Distributor;
  const existingIds = [13, 28, 36];
  const nonExistingIds = [79, 84, 94];

  beforeAll(() => {
    distributorTypeNull = Distributor.create({
      id: 13,
      name: 'Test Dist55',
      code: 'DIST01',
      type: null,
      custom_affiliate_tags: [
        {
          id: 50,
          affiliate: 'Test affiliate',
          custom_affiliate_tag: '?tag=123',
          custom_affiliate_url: 'https://www.ttt.philo3.com',
        },
      ],
    });
  });

  it('Should find all distributors', async () => {
    const distributors = await repository.findAll();

    expect(distributors.length).toBeGreaterThan(0);
  });

  it('Should find many distributors', async () => {
    const distributors = await repository.findMany(existingIds);

    expect(distributors.length).toEqual(existingIds.length);
  });

  it('Should throw while using findMany distributors', async () => {
    // @ts-ignore
    await expect(async () => repository.findMany(nonExistingIds))
      .rejects.toThrowError(DistributorError.DistributorNotFound);
  });

  it('Should find distributor with Type null', async () => {
    const distributor = await repository.findOne(distributorTypeNull.id);

    expect(distributor).toEqual(distributorTypeNull);
  });

  it('Should find distributor with Type not null', async () => {
    const distributor = await repository.findOne(DISTRIBUTOR_ID_TYPE_NOT_NULL);

    expect(distributor).toBeDefined();
    expect(distributor?.type).not.toBeNull();
  });

  it('Should not find any distributor', async () => {
    // @ts-ignore
    await expect(async () => repository.findOne(-1))
      .rejects.toThrowError(DistributorError.DistributorNotFound);
  });

  it('Should reject unexpected error', async () => {
    // @ts-ignore
    await expect(async () => repository.findOne({ name: 'hello' } as number))
      .rejects.toThrowError(DistributorError.DistributorUnexpectedError);
  });
});
