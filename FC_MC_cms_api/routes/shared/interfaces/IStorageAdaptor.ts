export interface IStorageAdaptor {
  // File should be in Base64 format
  store(path: string, file: string, filename?: string): Promise<string>
  remove(path: string): Promise<boolean>
}
