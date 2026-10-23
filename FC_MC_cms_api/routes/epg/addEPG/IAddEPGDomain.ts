import { EPGRequestDto } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';

export interface IAddEPGDomain {
  addNewEPG(epg: EPGRequestDto): Promise<EPG>
}
