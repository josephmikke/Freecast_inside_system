import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import EPG from '../shared/EPG';

export interface IGetEPGsDomain {
  getEPGs(filter: EPGQueryParameters): Promise<EPG[]>
}
