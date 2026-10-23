import { S3Destination } from '@aws-sdk/client-mediapackage';

import { HarvestJob, RecordingStatus } from '../../shared/dto/RecordingDto';
import { IScheduler } from '../../shared/scheduler/IScheduler';
import { Target } from '../../shared/scheduler/OneTimeScheduleAdaptor';
import { IRecorder } from '../shared/IRecorder';
import { IRecordingRepository } from '../shared/IRecordingRepository';
import { RecorderError } from '../shared/RecorderError';
import Recording from '../shared/Recording';
import { RecordingError } from '../shared/RecordingError';

import { TooManyRequestsException } from '@aws-sdk/client-mediapackage';
import { IRecorderDomain } from './IRecorderDomain';

export default class RecorderDomain implements IRecorderDomain {
  constructor(
    private readonly recordingRepository: IRecordingRepository,
    private readonly recorderAdaptor: IRecorder<S3Destination>,
    private readonly oneTimeScheduler: IScheduler<Target>,
  ) {
  }

  private static HLS_ID = 'HLS';

  private static DASH_ID = 'DASH';

  private static extractRecordingId({ harvest_job }: HarvestJob) {
    const [timestamp, recordingId, playlistType] = harvest_job.id.split('-');
    return { timestamp, recordingId, playlistType };
  }

  private async updateGlobalStatus(recording: Recording, status: RecordingStatus) {
    const updatedRecording = Object.assign({}, recording, {
      updatedAt: new Date().toISOString(),
      status,
    });
    await this.recordingRepository.updateStatus(recording, 'status', status);
    return updatedRecording;
  }

  private async updateHlsStatus(recording: Recording, status: RecordingStatus) {
    const updatedRecording = Object.assign({}, recording, {
      updatedAt: new Date().toISOString(),
      hlsStatus: status,
    });
    await this.recordingRepository.updateStatus(recording, 'hlsStatus', status);
    return updatedRecording;
  }

  private async updateDashStatus(recording: Recording, status: RecordingStatus) {
    const updatedRecording = Object.assign({}, recording, {
      updatedAt: new Date().toISOString(),
      dashStatus: status,
    });
    await this.recordingRepository.updateStatus(recording, 'dashStatus', status);
    return updatedRecording;
  }

  private async updateFailureReason(event: HarvestJob, error: string) {
    const { recordingId } = RecorderDomain.extractRecordingId(event);
    const recording = await this.recordingRepository.findOne(recordingId);
    if (!recording) throw new RecordingError.RecordingNotFound();
    if (!error || error === "")
      return;
    if (error.indexOf("originEndpointId must have startover enabled") > 0 )
      return
    await this.recordingRepository.updateUniqueField<string>(recording, 'failureReason', error);
  }

  async fail(event: HarvestJob, error: string): Promise<void> {
    try {
      await this.updateFailureReason(event, error);
      await this.removeFromQueue(event);
    } catch (e) {
      console.log(e);
    }
  }

  async start(event: HarvestJob): Promise<void> {
    const { recordingId, playlistType } = RecorderDomain.extractRecordingId(event);
    const recording = await this.recordingRepository.findOne(recordingId);
    if (!recording) throw new RecordingError.RecordingNotFound();
    try {
      await this.recorderAdaptor.startRecording({
        id: event.harvest_job.id, // Should add the timestamp
        channel: event.harvest_job.origin_endpoint_id,
        destination: {
          BucketName: process.env.STORAGE_BUCKET!,
          RoleArn: process.env.NPVR_ROLE_ARN!,
          ManifestKey: event.harvest_job.s3_destination.manifest_key,
        },
        endTime: event.harvest_job.end_time,
        startTime: event.harvest_job.start_time,
      });
      if (playlistType === RecorderDomain.HLS_ID) {
        await this.updateHlsStatus(recording, RecordingStatus.STARTED);
      }
      if (playlistType === RecorderDomain.DASH_ID) {
        await this.updateDashStatus(recording, RecordingStatus.STARTED);
      }
    } catch (e) {
      console.log("error ==================>>>>>>>>>>>>>>>>>>>>>>>", e);
      
      switch (true) {
        case e instanceof RecorderError.LimitExceeded:
        case e instanceof TooManyRequestsException:
          await this.addToQueue(recording, playlistType as 'HLS' | 'DASH');
          break;

        case e instanceof RecorderError.UnableToStartRecording: {
          const updatedRecording = await this.updateGlobalStatus(recording, RecordingStatus.FAILED);
          if (playlistType === RecorderDomain.HLS_ID) {
            await this.updateHlsStatus(updatedRecording, RecordingStatus.FAILED);
          }
          if (playlistType === RecorderDomain.DASH_ID) {
            await this.updateDashStatus(updatedRecording, RecordingStatus.FAILED);
          }
          throw e;
        }

        default:
          console.log(e);
          throw new Error(e);
      }
    }
  }

  async addToQueueWithEvent(event: HarvestJob): Promise<void> {
    const { recordingId, playlistType } = RecorderDomain.extractRecordingId(event);
    const recording = await this.recordingRepository.findOne(recordingId);
    if (!recording) throw new RecordingError.RecordingNotFound();
    await this.addToQueue(recording, playlistType as 'HLS' | 'DASH');
  }

  async addToQueue(recording: Recording, playlistType: 'HLS' | 'DASH'): Promise<void> {
    const updatedRecording = await this.updateGlobalStatus(recording, RecordingStatus.QUEUED);
    if (playlistType === RecorderDomain.HLS_ID) {
      await this.updateHlsStatus(updatedRecording, RecordingStatus.QUEUED);
    }
    if (playlistType === RecorderDomain.DASH_ID) {
      await this.updateDashStatus(updatedRecording, RecordingStatus.QUEUED);
    }
  }

  async archive(event: HarvestJob): Promise<void> {
    const { recordingId, playlistType } = RecorderDomain.extractRecordingId(event);
    const recording = await this.recordingRepository.findOne(recordingId);
    if (!recording) throw new RecordingError.RecordingNotFound();
    if (playlistType === RecorderDomain.HLS_ID) {
      const updatedRecording = await this.updateHlsStatus(recording, RecordingStatus.SUCCEEDED);
      if (recording.dashStatus === RecordingStatus.SUCCEEDED) {
        await this.updateGlobalStatus(updatedRecording, RecordingStatus.SUCCEEDED);
      }
      await this.oneTimeScheduler.removeSchedule(`${recording.program.id}-hls`);
    }
    if (playlistType === RecorderDomain.DASH_ID) {
      const updatedRecording = await this.updateDashStatus(recording, RecordingStatus.SUCCEEDED);
      if (recording.hlsStatus === RecordingStatus.SUCCEEDED) {
        await this.updateGlobalStatus(updatedRecording, RecordingStatus.SUCCEEDED);
      }
      await this.oneTimeScheduler.removeSchedule(`${recording.program.id}-dash`);
    }
  }
  async removeFromQueue(event: HarvestJob): Promise<void> {
    const { recordingId, playlistType } = RecorderDomain.extractRecordingId(event);
    const recording = await this.recordingRepository.findOne(recordingId);
    if (!recording) throw new RecordingError.RecordingNotFound('archive');
    const updatedRecording = await this.updateGlobalStatus(recording, RecordingStatus.FAILED);
    await this.oneTimeScheduler.removeSchedule(`${recording.program.id}-dash`);
    await this.oneTimeScheduler.removeSchedule(`${recording.program.id}-hls`);
    if (playlistType === RecorderDomain.HLS_ID) {
      await this.updateHlsStatus(updatedRecording, RecordingStatus.FAILED);
    }
    if (playlistType === RecorderDomain.DASH_ID) {
      await this.updateDashStatus(updatedRecording, RecordingStatus.FAILED);
    }
  }

  async startNext(): Promise<void> {
    const queuedRecordings = await this.recordingRepository.findAllByStatus(RecordingStatus.QUEUED);
    const recording = queuedRecordings?.[0];
    if (!recording) return;

    if (recording.dashStatus === RecordingStatus.PENDING
      || recording.dashStatus === RecordingStatus.QUEUED) {
      await this.start({
        harvest_job: {
          id: `${recording.program.id}-${recording.id}-${RecorderDomain.DASH_ID}`,
          channel_id: recording.extId,
          start_time: recording.program.start_time,
          end_time: recording.program.end_time,
          origin_endpoint_id: `DASH_${recording.extId}_Encrypted`,
          s3_destination: {
            bucket_name: process.env.STORAGE_BUCKET!,
            manifest_key: recording.destination.dash.value(),
            role_arn: process.env.NPVR_ROLE_ARN!,
          },
          status: recording.status,
        },
      });
    }
    if (recording.hlsStatus === RecordingStatus.PENDING
      || recording.hlsStatus === RecordingStatus.QUEUED) {
      await this.start({
        harvest_job: {
          id: `${recording.program.id}-${recording.id}-${RecorderDomain.HLS_ID}`,
          channel_id: recording.extId,
          start_time: recording.program.start_time,
          end_time: recording.program.end_time,
          origin_endpoint_id: `HLS_${recording.extId}_Encrypted`,
          s3_destination: {
            bucket_name: process.env.STORAGE_BUCKET!,
            manifest_key: recording.destination.hls.value(),
            role_arn: process.env.NPVR_ROLE_ARN!,
          },
          status: recording.status,
        },
      });
    }
  }
}
