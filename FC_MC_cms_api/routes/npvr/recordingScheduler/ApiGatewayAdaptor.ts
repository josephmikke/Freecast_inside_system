import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { ChannelError } from '../../channel/shared/ChannelError';
import { RecordingRequestDto, ScheduleRecordingEvent } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import { MediaPackageIdError } from '../../shared/valueObjects/MediaPackageId';
import { RecordingError } from '../shared/RecordingError';

import { IRecordingSchedulerDomain } from './IRecordingSchedulerDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<ScheduleRecordingEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IRecordingSchedulerDomain<RecordingRequestDto>) {
    this.domain = domain;
  }

  async handler(event: ScheduleRecordingEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { body } = event;
    try {
      const recording = await this.domain.schedule(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/npvr/${recording.username}/${recording.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof RecordingError.ProgramNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Program Not Found',
            }),
          };

        case e instanceof ChannelError.ChannelNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Channel Not Found',
            }),
          };

        case e instanceof MediaPackageIdError.InvalidMediaPackageId:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Invalid MediaPackage id: ${e}`,
            }),
          };

        case e instanceof SchedulerError.UnableToCreateSchedule:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Recording scheduler: Unable to create schedule: ${e}`,
            }),
          };

        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
