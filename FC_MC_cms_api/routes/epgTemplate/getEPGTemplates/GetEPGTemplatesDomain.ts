import EPGTemplate from '../shared/EPGTemplate';
import { IEPGTemplateRepository } from '../shared/IEPGTemplateRepository';

import { IGetEPGTemplatesDomain } from './IGetEPGTemplatesDomain';

export default class GetEPGTemplatesDomain implements IGetEPGTemplatesDomain {
  private readonly repository: IEPGTemplateRepository;

  constructor(
    repository: IEPGTemplateRepository,
  ) {
    this.repository = repository;
  }

  getEPGTemplates(): Promise<EPGTemplate[]> {
    return this.repository.findAll();
  }
}
