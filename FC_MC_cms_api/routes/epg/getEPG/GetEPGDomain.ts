import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';

import { IGetEPGDomain } from './IGetEPGDomain';

export default class GetEPGDomain implements IGetEPGDomain {
  constructor(private readonly epgRepository: IEPGRepository) {}

  async getEPG(id: string, filter: EPGQueryParameters): Promise<EPG> {
    const epg = await this.epgRepository.findOne(id, {
      filter,
      ignore: false,
    });
    if (!epg) throw new EPGError.EPGNotFound();
    return epg;
  }
}
