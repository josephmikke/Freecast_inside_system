import Package from 'routes/package/shared/Package';

import { LocationDto, LocationType } from '../../shared/dto/LocationDto';
import Asset from '../../shared/interfaces/Asset';

type OmittedLocations = Omit<LocationDto, 'id' | 'countries' | 'states' | 'cities' | 'zipCodes' | 'packages'>;

export default class Location extends Asset {
  static relations = {
    [LocationType.COUNTRY]: [
      LocationType.STATE,
    ],
    [LocationType.STATE]: [
      LocationType.CITY,
    ],
    [LocationType.CITY]: [
      LocationType.ZIPCODE,
    ],
    [LocationType.ZIPCODE]: [
    ],
    [LocationType.PACKAGE]: [
      LocationType.COUNTRY, LocationType.STATE, LocationType.CITY, LocationType.ZIPCODE,
    ],
  };

  public readonly name: string;

  public readonly slug: string;

  public readonly type: LocationType;

  public countries?: Array<Location>;

  public states?: Array<Location>;

  public cities?: Array<Location>;

  public zipCodes?: Array<Location>;

  public packages: Array<Package>;

  private constructor(props: Required<OmittedLocations>, id: string) {
    super(props, id);
    this.name = props.name;
    this.slug = props.slug;
    this.type = props.type;

    if (Location.relations[LocationType.COUNTRY].includes(this.type)) this.countries = [];
    if (Location.relations[LocationType.STATE].includes(this.type)) this.states = [];
    if (Location.relations[LocationType.CITY].includes(this.type)) this.cities = [];
    this.packages = [];
  }

  clearAffiliations() {
    this.countries = this.countries ? [] : undefined;
    this.states = this.states ? [] : undefined;
    this.cities = this.cities ? [] : undefined;
    this.zipCodes = this.zipCodes ? [] : undefined;
    this.packages = [];
  }

  sortAffiliations() {
    const sortByName = (a: Location | Package, b: Location | Package) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    };

    this.countries?.sort(sortByName);
    this.states?.sort(sortByName);
    this.cities?.sort(sortByName);
    this.zipCodes?.sort(sortByName);
    this.packages.sort(sortByName);

    return this;
  }

  getAffiliations(type: LocationType) {
    switch (type) {
      case LocationType.COUNTRY:
        return this.countries ?? [];
      case LocationType.STATE:
        return this.states ?? [];
      case LocationType.CITY:
        return this.cities ?? [];
      case LocationType.ZIPCODE:
        return this.zipCodes ?? [];
      default:
        return [];
    }
  }

  private isExistingAffiliation(affiliationList: Array<Location | Package>, id: string) {
    return affiliationList.filter((affiliation) => affiliation.id === id).length;
  }

  addAffiliation(affiliation: Location) {
    switch (affiliation.type) {
      case LocationType.COUNTRY:
        if (!this.isExistingAffiliation(this.countries ?? [], affiliation.id)) {
          this.countries?.push(affiliation);
        }
        break;
      case LocationType.STATE:
        if (!this.isExistingAffiliation(this.states ?? [], affiliation.id)) {
          this.states?.push(affiliation);
        }
        break;
      case LocationType.CITY:
        if (!this.isExistingAffiliation(this.cities ?? [], affiliation.id)) {
          this.cities?.push(affiliation);
        }
        break;
      case LocationType.ZIPCODE:
        if (!this.isExistingAffiliation(this.zipCodes ?? [], affiliation.id)) {
          this.zipCodes?.push(affiliation);
        }
        break;
      default:
        break;
    }
  }

  addPackage(packageItem: Package) {
    if (!this.isExistingAffiliation(this.packages, packageItem.id)) {
      this.packages.push(packageItem);
    }
  }

  static create(props: Required<OmittedLocations>, id: string): Location {
    return new Location(props, id);
  }
}
