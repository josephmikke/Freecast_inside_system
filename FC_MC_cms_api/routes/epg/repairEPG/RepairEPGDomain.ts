import { LambdaClient } from '@aws-sdk/client-lambda';

import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import LambdaAdaptor from '../shared/lambda/LambdaAdaptor';

import { IRepairEPGDomain } from './IRepairEPGDomain';

export default class RepairEPGDomain implements IRepairEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
    private readonly lambdaClient: LambdaClient,
    private readonly schedulerArn: string,
  ) {
  }

  private async deleteAllEPGPrograms(epgId: string): Promise<void> {
    const epg = await this.epgRepository.findOne(epgId, { filter: {}, ignore: true });
    if (!epg) {
      throw new EPGError.EPGNotFound();
    }
    const isDeleted = this.epgRepository.removeAllPrograms(epg);
    if (!isDeleted) throw new EPGError.EPGCannotBeDeleted();
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.EPG_PROGRAM,
      entityId: epg.id,
    });
  }

  private async ingestEPG(epgId: string): Promise<void> {
    const epg = await this.epgRepository.findOne(epgId, { filter: {}, ignore: true });
    if (!epg) throw new EPGError.EPGNotFound();

    const lambdaInvoker = new LambdaAdaptor(this.lambdaClient);
    await lambdaInvoker.invoke(this.schedulerArn, {
      epgId: epg.id,
    });
  }

  async repairEPG(epgId: string): Promise<void> {
    // Step 1: Delete all existing EPG programs
    await this.deleteAllEPGPrograms(epgId);
    // Step 2: Trigger re-ingestion
    await this.ingestEPG(epgId);
  }
}
