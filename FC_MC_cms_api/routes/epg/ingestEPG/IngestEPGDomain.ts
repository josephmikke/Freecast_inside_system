import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { IEventInvoker } from '../shared/lambda/IEventInvoker';

import { IIngestEPGDomain } from './IIngestEPGDomain';

export default class IngestEPGDomain implements IIngestEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly lambdaInvoker: IEventInvoker<string, Object, boolean>,
    private readonly schedulerArn: string,
  ) {}

  async ingestEPG(id: string): Promise<void> {
    const epg = await this.epgRepository.findOne(id, { filter: {}, ignore: true });
    if (!epg) throw new EPGError.EPGNotFound();

    await this.lambdaInvoker.invoke(this.schedulerArn, {
      epgId: epg.id,
    });
  }
}
