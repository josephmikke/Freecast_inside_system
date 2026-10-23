import { RecordingDto, RecordingRequestDto } from '../../shared/dto/RecordingDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IRecordingRepository } from '../shared/IRecordingRepository';
import Recording from '../shared/Recording';

import { IGetRecordingsDomain } from './IGetRecordingsDomain';

export default class GetRecordingsDomain implements IGetRecordingsDomain {
  constructor(
    private readonly repository: IRecordingRepository,
    private readonly recordingFactory: IFactory<Recording, RecordingRequestDto, RecordingDto>,
  ) {
  }

  async getRecordings(username: string): Promise<RecordingDto[]> {
    const recordins = await this.repository.findAllByUserId(username);
    return recordins.map((recording) => ({
      ...this.recordingFactory.toPersistence(recording),
      destination: {
        hls: recording.destination.hls.toJSON(),
        dash: recording.destination.dash.toJSON(),
      },
    }));
  }
}
