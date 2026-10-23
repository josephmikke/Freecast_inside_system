import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { IRecordingRepository } from '../shared/IRecordingRepository';
import { RecordingError } from '../shared/RecordingError';

import { ISystemDeleteRecordingsDomain } from './ISystemDeleteRecordingsDomain';

export default class SystemDeleteRecordingsDomain
  implements ISystemDeleteRecordingsDomain
{
  constructor(
    private readonly repository: IRecordingRepository,
    private readonly _storage: IStorageAdaptor
  ) {}

  async deleteRecordings(id: string): Promise<boolean> {
    const recording = await this.repository.findOne(id);
    if (!recording) throw new RecordingError.RecordingNotFound();
    const [dash] = recording.destination.dash.value().split('dash');
    const [hls] = recording.destination.hls.value().split('hls');
    await this._storage.remove(dash);
    await this._storage.remove(hls);
    return this.repository.remove(recording);
  }
}
