import { EPGRequestDto } from '../../shared/dto/EPGDto';

export interface IUpdateEPGDomain {
  updateEPG(id: string, epg: Partial<EPGRequestDto>): Promise<boolean>
}
