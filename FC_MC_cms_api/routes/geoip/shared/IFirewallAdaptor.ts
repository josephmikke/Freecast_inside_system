import GeoIpRule from './GeoIpRule';

export interface IFirewallAdaptor<T> {
  createRule(rule?: GeoIpRule): Promise<T[] | []>;
  createACL(rules: T[]): Promise<boolean>;
}
