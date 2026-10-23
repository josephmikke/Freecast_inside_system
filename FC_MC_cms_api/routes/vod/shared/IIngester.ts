export interface IIngester {
  ingest(id: string, resourceId: string, source: string): Promise<boolean>;
}
