import { RecordingStatus } from '../../shared/dto/RecordingDto';

import Recording from './Recording';

export interface IRecordingRepository {
  findOne(id: string): Promise<Recording | undefined>;
  findAllByUserId(username: string): Promise<Recording[] >
  findOneByUserId(username: string, id: string): Promise<Recording | undefined>
  findAllByStatus(status: RecordingStatus): Promise<Recording[]>
  remove(recording: Recording): Promise<boolean>
  removeFromUserList(recording: Recording | Recording[], username: string): Promise<boolean>
  removeRootEntity(recording: Recording): Promise<boolean>
  exists(recording: Recording): Promise<boolean>
  save(recording: Recording): Promise<boolean>
  updateStatus(
    recording: Recording, statusKey: string, statusValue: RecordingStatus
  ): Promise<boolean>
  updateUniqueField<T>(
    recording: Recording, fieldKey: string, fieldValue: T
  ): Promise<boolean>
}
