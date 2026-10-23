import Channel from '../../channel/shared/Channel';
import { ChannelError } from '../../channel/shared/ChannelError';
import { IChannelRepository } from '../../channel/shared/IChannelRepository';
import { EPGProgram } from '../../epg/shared/IParser';
import { RecordingDto, RecordingRequestDto } from '../../shared/dto/RecordingDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IScheduler } from '../../shared/scheduler/IScheduler';
import { Target } from '../../shared/scheduler/OneTimeScheduleAdaptor';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import AtExpression from '../../shared/valueObjects/AtExpression';
import { MediaPackageIdError } from '../../shared/valueObjects/MediaPackageId';
import { IRecordingRepository } from '../shared/IRecordingRepository';
import Recording from '../shared/Recording';
import { RecordingError } from '../shared/RecordingError';

import { IRecordingSchedulerDomain } from './IRecordingSchedulerDomain';

export interface RecordingSchedulerProps {
  s3destination: {
    bucketName: string;
    roleArn: string;
  },
  identity: {
    schedulerArn: string;
    schedulerRoleArn: string;
  }
}

export default class RecordingSchedulerDomain implements
    IRecordingSchedulerDomain<RecordingRequestDto> {
  constructor(
    private readonly scheduler: IScheduler<Target>,
    private readonly repository: IRecordingRepository,
    private readonly recordingFactory: IFactory<Recording, RecordingRequestDto, RecordingDto>,
    private readonly props: RecordingSchedulerProps,
    private readonly channelRepository: IChannelRepository,
  ) {
  }

  public static formatEndTime(program: EPGProgram) {
    const [endTime] = program.end_time.split(/\.|Z/);
    return endTime;
  }

  private createHlsRecordingSchedule(recording: Recording, channel: Channel, program: EPGProgram) {
    const runsAt = new AtExpression(RecordingSchedulerDomain.formatEndTime(program));
    return this.scheduler.schedule(`${program.id}-hls`, runsAt, 'UTC', {
      Arn: this.props.identity.schedulerArn,
      RoleArn: this.props.identity.schedulerRoleArn,
      Input: JSON.stringify({
        detail: {
          harvest_job: {
            id: `${program.id}-${recording.id}-HLS`,
            status: recording.status,
            start_time: recording.program.start_time,
            end_time: recording.program.end_time,
            channel_id: channel.mediapackageId.value(), // MediaPackage ID,
            s3_destination: {
              bucket_name: this.props.s3destination.bucketName, // 'test-npvr',
              manifest_key: `npvr/${channel.id}/${program.id}/hls/index.m3u8`,
              role_arn: this.props.s3destination.roleArn,
            },
            origin_endpoint_id: `HLS_${channel.mediapackageId.value()}_Encrypted`,
          },
        },
      }),
    });
  }

  private createDashRecordingSchedule(recording: Recording, channel: Channel, program: EPGProgram) {
    const runsAt = new AtExpression(RecordingSchedulerDomain.formatEndTime(program));
    return this.scheduler.schedule(`${program.id}-dash`, runsAt, 'UTC', {
      Arn: this.props.identity.schedulerArn,
      RoleArn: this.props.identity.schedulerRoleArn,
      Input: JSON.stringify({
        detail: {
          harvest_job: {
            id: `${program.id}-${recording.id}-DASH`,
            status: recording.status,
            start_time: recording.program.start_time,
            end_time: recording.program.end_time,
            channel_id: channel.mediapackageId.value(), // MediaPackage ID,
            s3_destination: {
              bucket_name: this.props.s3destination.bucketName, // 'test-npvr',
              manifest_key: `npvr/${channel.id}/${program.id}/dash/index.mpd`,
              role_arn: this.props.s3destination.roleArn,
            },
            origin_endpoint_id: `DASH_${channel.mediapackageId.value()}_Encrypted`,
          },
        },
      }),
    });
  }

  async schedule(rawRecording: RecordingRequestDto): Promise<Recording> {
    const channel = await this.channelRepository
      .findOne(rawRecording.channel, { filter: {}, ignore: true });
    if (!channel) {
      throw new ChannelError.ChannelNotFound();
    }
    if (channel.mediapackageId.value().length === 0) throw new MediaPackageIdError.InvalidMediaPackageId('MediaPackage id is not set.');
    let program = channel.epg?.programs.find(
      (epgProgram) => epgProgram.id === rawRecording.program,
    );
    if (!program) {
      const channelWithepg = await this.channelRepository
      .findOne(rawRecording.channel, { filter: {startTime: rawRecording.startTime}, ignore: false });

      const newProgram = channelWithepg?.epg?.programs[0]
      if (!newProgram)
        throw new RecordingError.ProgramNotFound();

      program = newProgram
    }
    const recording = await this.recordingFactory.toDomain({
      ...rawRecording,
      id: program.id,
      channel: channel.name,
      extId: channel.mediapackageId.value(),
      program,
      destination: {
        hls: `npvr/${channel.id}/${program.id}/hls/index.m3u8`,
        dash: `npvr/${channel.id}/${program.id}/dash/index.mpd`,
      },
    });
    if (await this.repository.findOneByUserId(recording.username, recording.id)) {
      return recording;
    }
    if (await this.repository.exists(recording)) {
      const upToDateRecording = await this.repository.findOne(recording.id);
      await this.repository.save(Object.assign(
        {},
        upToDateRecording,
        { username: recording.username },
      ));
      return recording;
    }
    await this.repository.save(recording);
    try {
      await this.createHlsRecordingSchedule(recording, channel, program);
      await this.createDashRecordingSchedule(recording, channel, program);
      return recording;
    } catch (e) {
      await this.repository.removeFromUserList(recording, rawRecording.username);
      throw new SchedulerError.UnableToCreateSchedule(e);
    }
  }
}
