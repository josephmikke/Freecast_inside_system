import { IngestionDto, MediaJobStatus, MrssIngestionStatus } from '../../../shared/dto/vod/IngestDto';
import Asset from '../../../shared/interfaces/Asset';

export default class Ingestion extends Asset {
  public readonly parentId: string;

  public status: MrssIngestionStatus;

  public failures?: Array<string>;

  public saved?: Array<string>;

  public jobs: { [id: string]: MediaJobStatus };

  private constructor(props: Required<Omit<IngestionDto, 'id'>>, id: string) {
    super(props, id);
    this.parentId = props.parentId;
    this.status = props.status;
    this.failures = props.failures;
    this.saved = props.saved;
    this.jobs = props.jobs;

    if (this.failures?.length === 0) delete this.failures;
    if (this.saved?.length === 0) delete this.saved;
  }

  public setStatus(status: MrssIngestionStatus) {
    this.status = status;
  }

  public addFailure(failure: string) {
    if (!this.failures) this.failures = [];
    this.failures?.push(failure);
  }

  public addSaved(saved: string) {
    if (!this.saved) this.saved = [];
    this.saved?.push(saved);
  }

  public updateJob(id: string, status: MediaJobStatus) {
    this.jobs[id] = status;
  }

  public isIngestionCompleted() {
    const jobsStatus = Object.values(this.jobs);

    for (let i = 0; i < jobsStatus.length; i += 1) {
      switch (jobsStatus[i]) {
        case MediaJobStatus.MEDIACONVERT_PROGRESSING:
        case MediaJobStatus.MEDIACONVERT_SUBMITTED:
        case MediaJobStatus.MEDIACONVERT_COMPLETE:
        case MediaJobStatus.MEDIAPACKAGE_PROGRESSING:
        case MediaJobStatus.MEDIAPACKAGE_COMPLETE:
          return false;
        default:
      }
    }
    return true;
  }

  public isIngestionFailed() {
    const jobsStatus = Object.values(this.jobs);

    for (let i = 0; i < jobsStatus.length; i += 1) {
      switch (jobsStatus[i]) {
        case MediaJobStatus.MEDIACONVERT_ERROR:
        case MediaJobStatus.MEDIAPACKAGE_ERROR:
          return true;
        default:
      }
    }
    return false;
  }

  static create(props: Required<Omit<IngestionDto, 'id'>>, id: string): Ingestion {
    return new Ingestion(props, id);
  }
}
