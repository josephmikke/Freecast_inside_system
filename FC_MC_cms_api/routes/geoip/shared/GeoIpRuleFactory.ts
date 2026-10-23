import { IPackageRepository } from '../../package/shared/IPackageRepository';
import { GeoIpRuleDto, GeoIpRuleRequestDto, GeoIpRuleType } from '../../shared/dto/GeoIpRuleDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import CIDR from '../../shared/valueObjects/CIDR';
import CountryCode from '../../shared/valueObjects/CountryCode';

import GeoIpRule from './GeoIpRule';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class GeoIpRuleFactory implements
    IFactory<GeoIpRule, GeoIpRuleRequestDto, GeoIpRuleDto> {
  constructor(
    private readonly uid: UID,
    private readonly packageRepository: IPackageRepository,
  ) {
  }

  private static getValueObject(value: string, type: GeoIpRuleType) {
    const choices = {
      [GeoIpRuleType.CIDR]: () => new CIDR(value),
      [GeoIpRuleType.LOCATION]: () => new CountryCode(value),
      [GeoIpRuleType.USER_AGENT]: () => value,
    };

    return choices[type as keyof typeof GeoIpRuleType]();
  }

  async toDomain(raw: GeoIpRuleDto): Promise<GeoIpRule> {
    const id = raw.id || this.uid.generate(8);
    const geoIpRule = GeoIpRule.create({
      ...raw,
      extId: raw.extId ?? id,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
      value: GeoIpRuleFactory.getValueObject(raw.value as string, raw.ruleType),
    }, id);
    if (!raw.packages?.length) return geoIpRule;
    const packages = await this.packageRepository.findMany(raw.packages);
    packages.map((item) => geoIpRule.addPackage(item));
    return geoIpRule;
  }

  toPersistence(raw: GeoIpRule): Required<GeoIpRuleDto> {
    const packages = raw.packages.map((item) => item.id);
    if (raw.value instanceof CountryCode
        || raw.value instanceof CIDR) return { ...raw, packages, value: raw.value.value() };
    return { ...raw, packages };
  }
}
