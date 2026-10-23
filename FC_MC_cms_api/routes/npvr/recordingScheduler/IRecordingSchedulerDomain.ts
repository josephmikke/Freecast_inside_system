import Recording from '../shared/Recording';

export interface IRecordingSchedulerDomain<T> {
  schedule(payload: T): Promise<Recording>
}
