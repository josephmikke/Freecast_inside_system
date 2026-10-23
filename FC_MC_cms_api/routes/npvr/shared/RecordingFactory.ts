import {
  PersistedRecordingDto, RecordingDto, RecordingRequestDto, RecordingStatus,
} from '../../shared/dto/RecordingDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import Recording from './Recording';

export default class RecordingFactory implements IFactory<Recording,
RecordingRequestDto, RecordingDto> {
  async toDomain(raw: RecordingDto): Promise<Recording> {
    return Recording.create({
      ...raw,
      status: raw.status || RecordingStatus.PENDING,
      dashStatus: raw.dashStatus || RecordingStatus.PENDING,
      hlsStatus: raw.hlsStatus || RecordingStatus.PENDING,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
      failureReason: raw.failureReason ?? '',
    }, raw.id);
  }

  toPersistence(recording: Recording): PersistedRecordingDto {
    return {
      id: recording.id,
      channel: recording.channel,
      destination: {
        hls: recording.destination.hls.value(),
        dash: recording.destination.dash.value(),
      },
      dashStatus: recording.dashStatus,
      hlsStatus: recording.hlsStatus,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
      extId: recording.extId,
      program: recording.program,
      status: recording.status,
      failureReason: recording.failureReason ?? '',
      username: recording.username,
      enabled: recording.enabled,
    };
  }
}
