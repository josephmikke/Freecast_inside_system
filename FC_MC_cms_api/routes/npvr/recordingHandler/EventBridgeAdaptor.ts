import { Context, EventBridgeEvent } from 'aws-lambda';

import { RecordingEvent, RecordingStatus } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { RecordingError } from '../shared/RecordingError';

import { IRecorderDomain } from './IRecorderDomain';
import { TooManyRequestsException } from '@aws-sdk/client-mediapackage';
export default class EventBridgeAdaptor implements
    IInvoker<EventBridgeEvent<string, RecordingEvent>, Context, any> {
  constructor(private readonly domain: IRecorderDomain) {
  }

  async handler(
    event: EventBridgeEvent<string, RecordingEvent>,
    _context?: Context,
  ) {
    try {
      switch (event.detail.harvest_job.status) {
        case RecordingStatus.PENDING:
          await this.domain.start(event.detail);
          console.log('PENDING CASE');
          break;

        case RecordingStatus.SUCCEEDED:
          await this.domain.archive(event.detail);
          await this.domain.startNext();
          console.log('SUCCEEDED CASE');
          break;

        case RecordingStatus.FAILED:
          await this.domain.removeFromQueue(event.detail);
          console.log('FAILED CASE');
          break;

        default:
          console.log('Not handled');
          break;
      }
    } catch (e) {
      console.log("=====error=============>>>>>>>>>>>>>>>>>>>>>>>", e);
      switch (true) {
        case e instanceof RecordingError.RecordingNotFound:
          console.error('RecordingNotFound', e);
          break;
        case e instanceof RecordingError.ProgramNotFound:
          console.error('ProgramNotFound', e);
          break;
        case e instanceof String && e.indexOf("Error: TooManyRequestsException: You reached the quota for resource=IN_PROGRESS harvest jobs") > 0:
          console.log("===========>", e);
        case e instanceof TooManyRequestsException :
          this.domain.addToQueueWithEvent(event.detail);
          return;
        default:
          console.error('Other error', e);
          break;
      }
      await this.domain.fail(event.detail, `${e}`);
    }
  }
}
