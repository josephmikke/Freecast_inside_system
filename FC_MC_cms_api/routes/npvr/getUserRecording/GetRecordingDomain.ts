import { RecordingDto, RecordingRequestDto } from '../../shared/dto/RecordingDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IRecordingRepository } from '../shared/IRecordingRepository';
import Recording from '../shared/Recording';
import { RecordingError } from '../shared/RecordingError';

import { IGetRecordingDomain } from './IGetRecordingDomain';

export default class GetRecordingDomain implements IGetRecordingDomain {
  constructor(
    private readonly repository: IRecordingRepository,
    private readonly recordingFactory: IFactory<Recording, RecordingRequestDto, RecordingDto>,
  ) {
  }

  async getRecording(username: string, id: string): Promise<RecordingDto> {
    const recording = await this.repository.findOneByUserId(username, id);
    if (!recording) throw new RecordingError.RecordingNotFound();
    return {
      ...this.recordingFactory.toPersistence(recording),
      destination: {
        hls: recording.destination.hls.toJSON(),
        dash: recording.destination.dash.toJSON(),
      },
    };
  }
}
