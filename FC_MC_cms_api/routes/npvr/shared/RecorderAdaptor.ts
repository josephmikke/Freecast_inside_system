import {
  CreateHarvestJobCommand,
  MediaPackageClient,
  S3Destination,
  DescribeHarvestJobCommand,
  TooManyRequestsException,
  NotFoundException,
  UnprocessableEntityException
} from '@aws-sdk/client-mediapackage';

import { IRecorder, StartRecordingProps } from './IRecorder';
import { RecorderError } from './RecorderError';

export default class RecorderAdaptor implements IRecorder<S3Destination> {
  constructor(private readonly client: MediaPackageClient) {
  }

  async startRecording(params: StartRecordingProps<S3Destination>): Promise<boolean> {
    try {
      const describeCommand = new DescribeHarvestJobCommand({ Id: params.id })
      const response = await this.client.send(describeCommand); // check if job exists
      if (response?.Id === params.id)
        return false;
      
      const command = new CreateHarvestJobCommand({
        Id: params.id,
        StartTime: params.startTime,
        EndTime: params.endTime,
        OriginEndpointId: params.channel,
        S3Destination: params.destination,
      });
      return !!await this.client.send(command);

    } catch (e) {
      if (e instanceof TooManyRequestsException || e instanceof UnprocessableEntityException) {

        throw new RecorderError.LimitExceeded(e.message);
      }
      if (e instanceof NotFoundException ) {
        
        const command = new CreateHarvestJobCommand({
          Id: params.id,
          StartTime: params.startTime,
          EndTime: params.endTime,
          OriginEndpointId: params.channel,
          S3Destination: params.destination,
        });
        return !!await this.client.send(command);
      }
      throw new RecorderError.UnableToStartRecording(e);
    }
    return true;
  }
}
