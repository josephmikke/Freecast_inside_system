import Package from '../../package/shared/Package';
import {
  GeoIpRuleDto, GeoIpRulePolicyType, GeoIpRuleType,
} from '../../shared/dto/GeoIpRuleDto';
import Asset from '../../shared/interfaces/Asset';
import CIDR from '../../shared/valueObjects/CIDR';
import CountryCode from '../../shared/valueObjects/CountryCode';

export default class GeoIpRule extends Asset {
  public readonly name: string;

  public readonly description: string;

  public packages: Package[];

  public weight: number;

  public readonly policyType: GeoIpRulePolicyType;

  public readonly ruleType: GeoIpRuleType;

  public readonly value: CIDR | CountryCode | string;

  private constructor(props: Required<Omit<GeoIpRuleDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.description = props.description;
    this.packages = [];
    this.policyType = props.policyType;
    this.ruleType = props.ruleType;
    this.value = props.value;
    this.weight = props.weight;
  }

  addPackage(item: Package) {
    this.packages.push(item);
  }

  updateWeight(weight: number) {
    this.weight = weight;
  }

  static create(props: Required<Omit<GeoIpRuleDto, 'id'>>, id: string): GeoIpRule {
    return new GeoIpRule(props, id);
  }
}
