import { HarvestJob } from '../../shared/dto/RecordingDto';
import Recording from '../shared/Recording';

export interface IRecorderDomain {
  start(recording: HarvestJob): Promise<void>;
  fail(recording: HarvestJob, error: string): Promise<void>;
  addToQueueWithEvent(recording: HarvestJob): Promise<void>;
  addToQueue(recording: Recording, playlistType: 'HLS' | 'DASH'): Promise<void>;
  startNext(): Promise<void>;
  removeFromQueue(recording: HarvestJob): Promise<void>;
  archive(recording: HarvestJob): Promise<void>;
}
