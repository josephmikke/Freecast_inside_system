export default interface ICDNAdaptor {
  invalidateCache(paths: Array<string>): Promise<void>;
}
