import { RecordingDto } from '../../shared/dto/RecordingDto';

export interface IGetRecordingsDomain {
  getRecordings(username: string): Promise<RecordingDto[]>
}
