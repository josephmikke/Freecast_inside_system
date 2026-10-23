import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';

export interface IGetEPGDomain {
  getEPG(id: string, filter: EPGQueryParameters): Promise<EPG>
}
