import { RecordingDto } from '../../shared/dto/RecordingDto';

export interface IGetRecordingDomain {
  getRecording(username: string, id: string): Promise<RecordingDto>
}
