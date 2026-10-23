import drainResponse from '../../epg/shared/drainResponse';
import { IHttpClient } from '../../epg/shared/IHttpClient';
import { DistributorDto } from '../../shared/dto/DistributorDto';

import Distributor from './Distributor';
import { DistributorError } from './DistributorError';
import { IDistributorRepository } from './IDistributorRepository';

export default class DistributorRepository implements IDistributorRepository {
  constructor(
    private readonly httpClient: IHttpClient<Response>,
    private readonly baseUrl: string,
  ) {}

  async findAll(): Promise<Distributor[]> {
    try {
      const response = await this.httpClient.get(this.baseUrl);

      return (await response.json())
        .map((distributorDto: DistributorDto) => Distributor.create(distributorDto));
    } catch (e) {
      throw new DistributorError.DistributorUnexpectedError(e);
    }
  }

  async findMany(ids: number[] | string[]): Promise<Distributor[]> {
    try {
      return await Promise.all(ids.map(async (id) => {
        const response = await this.httpClient.get(`${this.baseUrl}${id}/`);

        if (response.status === 404) {
          await drainResponse(response);
          throw new DistributorError.DistributorNotFound();
        }
        return Distributor.create(await response.json());
      }));
    } catch (e) {
      switch (true) {
        case e instanceof DistributorError.DistributorNotFound:
          throw e;

        default:
          throw new DistributorError.DistributorUnexpectedError(e);
      }
    }
  }

  async findOne(id: number): Promise<Distributor | undefined> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}${id}/`);

      if (response.status === 404) {
        await drainResponse(response);
        throw new DistributorError.DistributorNotFound();
      }
      return Distributor.create(await response.json());
    } catch (e) {
      switch (true) {
        case e instanceof DistributorError.DistributorNotFound:
          throw e;

        default:
          throw new DistributorError.DistributorUnexpectedError(e);
      }
    }
  }
}
