import { IRecordingRepository } from '../shared/IRecordingRepository';

import { RecordingBulkDelete } from './ApiGatewayAdaptor';
import { IDeleteRecordingsDomain } from './IDeleteRecordingsDomain';

export default class DeleteRecordingsDomain implements
    IDeleteRecordingsDomain<RecordingBulkDelete[]> {
  constructor(private readonly repository: IRecordingRepository) {
  }

  async deleteRecordings(username: string, ids: string[]): Promise<RecordingBulkDelete[]> {
    const recordings = await this.repository.findAllByUserId(username);
    return Promise.all(ids.map(async (id) => {
      const exists = recordings.find((recording) => recording.id === id);
      if (exists) {
        await this.repository.removeFromUserList(exists, username);
        return {
          id,
          statusCode: 204,
        };
      }
      return {
        id,
        statusCode: 404,
      };
    }));
  }
}
