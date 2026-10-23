import { GeoIpRulePolicyType } from '../../shared/dto/GeoIpRuleDto';
import CountryCode from '../../shared/valueObjects/CountryCode';

export interface IRuleBuilder<T, U> {
  setName(name: string): this;
  setPriority(weight: number): this;
  setLocationStatement(countryCode: CountryCode): this;
  setCIDRStatement(cidr: string): Promise<this>;
  setUserAgentStatement(userAgent: string): this;
  setAction(policy: GeoIpRulePolicyType): this;
  setAndStatement(firstStatement: U, ids: string[]): this;
  setRuleGroup(arn: string): this;
  create(): IRuleBuilder<T, U>
  getResult(): T
}
