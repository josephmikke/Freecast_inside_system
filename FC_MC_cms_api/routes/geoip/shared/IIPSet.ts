import CIDR from '../../shared/valueObjects/CIDR';

export interface IIPSet {
  create(name: string, cidr: CIDR): Promise<string>;
  delete(name: string): Promise<boolean>;
  exists(name: string): Promise<string | undefined>
}
