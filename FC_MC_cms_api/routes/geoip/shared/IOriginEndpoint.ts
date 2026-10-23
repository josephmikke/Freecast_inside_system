export interface IOriginEndpoint<T> {
  describeOriginEndpoints(id: T): Promise<string[]>
}
