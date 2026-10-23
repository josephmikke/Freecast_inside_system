export interface ISystemDeleteRecordingsDomain {
  deleteRecordings(id: string): Promise<boolean>
}
