import { IIngester } from '../../shared/IIngester';

export default class MockMediaPackage implements IIngester {
  async ingest(_id: string, _resourceId: string, _source: string): Promise<boolean> {
    return true;
  }
}
