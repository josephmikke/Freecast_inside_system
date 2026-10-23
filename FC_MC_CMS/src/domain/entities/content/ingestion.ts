export interface IngestionResult {
  id: string;
  extId: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  status: string;
  failures: string[];
  saved: string[];
  jobs: {
    [key: string]: string;
  }
  url?: string;
}
