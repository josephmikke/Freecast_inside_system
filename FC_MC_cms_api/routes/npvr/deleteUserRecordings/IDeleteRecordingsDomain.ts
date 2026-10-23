export interface IDeleteRecordingsDomain<T> {
  deleteRecordings(username: string, ids: string[]): Promise<T>
}
