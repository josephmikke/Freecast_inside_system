import Stream from './Stream';

export interface IStreamRepository {
  findAll(): Promise<Stream[]>
  findMany(ids: Array<string>): Promise<Array<Stream>>
  findOne(id: string): Promise<Stream | undefined>
  hasRelationships(item: Stream): Promise<boolean>
  remove(item: Stream): Promise<boolean>
  save(channel: Stream): Promise<boolean>
  exists(channel: Stream): Promise<boolean>
}
