export interface IDeleteChannelDomain {
  deleteChannel(id: string): Promise<void>
}
