import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';
import { IEPGRepository } from '../shared/IEPGRepository';

import { IGetEPGsDomain } from './IGetEPGsDomain';

export default class GetEPGsDomain implements IGetEPGsDomain {
  constructor(private readonly epgRepository: IEPGRepository) {}

  async getEPGs(filter: EPGQueryParameters): Promise<EPG[]> {
    return this.epgRepository.findAll({
      filter,
      ignore: false,
    });
  }
}
