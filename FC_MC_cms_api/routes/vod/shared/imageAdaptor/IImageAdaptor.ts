export interface IImageAdaptor {
  ingest(url: string): Promise<void>;
  value(): string;
}
