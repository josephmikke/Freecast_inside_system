export interface IDeleteAutoIngestionDomain {
  deleteAutoIngestion(id: string): Promise<boolean>
}
