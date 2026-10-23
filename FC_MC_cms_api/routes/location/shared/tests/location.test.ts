import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import Package from '../../../package/shared/Package';
import { LocationType } from '../../../shared/dto/LocationDto';
import Location from '../Location';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const LOCATION_ID = new UIDGenerator().generate(8);
const SECOND_LOCATION_ID = new UIDGenerator().generate(8);

const expectedLocation = Location.create({
  slug: 'location-package-us',
  extId: 'location-package-us',
  type: LocationType.STATE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, LOCATION_ID);

const secondLocation = Location.create({
  slug: 'location-country-us',
  extId: 'location-country-us',
  type: LocationType.PACKAGE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, SECOND_LOCATION_ID);

describe('LocationFactory', () => {
  describe('sortAffiliations', () => {
    it('should sort affiliations', async () => {
      const firstPackage = Package.create({
        extId: 'location-package-wu',
        name: 'Western Union',
        description: 'description',
        type: PackageType.INTERNAL,
        price: 'free',
        revenueModel: RevenueModel.FREE,
        default: true,
        thumbnail: 'package/packageid/thumbnail.png',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        weight: 0,
      }, 'first-package-entity');
      const secondPackage = Package.create({
        extId: 'location-package-us',
        name: 'US',
        description: 'description',
        type: PackageType.INTERNAL,
        price: 'free',
        revenueModel: RevenueModel.FREE,
        default: true,
        thumbnail: 'package/packageid/thumbnail.png',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        weight: 1,
      }, 'second-package-entity');

      const thirdPackage = Package.create({
        extId: 'location-package-ca',
        name: 'CANADA',
        description: 'description',
        type: PackageType.INTERNAL,
        price: 'free',
        revenueModel: RevenueModel.FREE,
        default: true,
        thumbnail: 'package/packageid/thumbnail.png',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        weight: 2,
      }, 'third-package-entity');

      const fourthPackage = Package.create({
        extId: 'location-package-wu',
        name: 'Western Union',
        description: 'description',
        type: PackageType.INTERNAL,
        price: 'free',
        revenueModel: RevenueModel.FREE,
        default: true,
        thumbnail: 'package/packageid/thumbnail.png',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        weight: 3,
      }, 'fourth-package-entity');
      expectedLocation.addPackage(firstPackage);
      expectedLocation.addPackage(secondPackage);
      expectedLocation.addPackage(thirdPackage);
      expectedLocation.addPackage(fourthPackage);

      expectedLocation.sortAffiliations();

      expect(expectedLocation.packages)
        .toEqual([thirdPackage, secondPackage, firstPackage, fourthPackage]);
      expectedLocation.packages = [];
    });
  });

  describe('addAffiliation', () => {
    it('should add nothing', async () => {
      const unknownLocation = Location.create({
        slug: 'location-country-us',
        extId: 'location-country-us',
        type: 9999 as unknown as LocationType,
        name: 'US',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(unknownLocation);
      expect(expectedLocation.getAffiliations(LocationType.COUNTRY).length).toEqual(0);
      expect(expectedLocation.getAffiliations(LocationType.STATE).length).toEqual(0);
      expect(expectedLocation.getAffiliations(LocationType.CITY).length).toEqual(0);
      expect(expectedLocation.getAffiliations(LocationType.ZIPCODE).length).toEqual(0);
      expect(expectedLocation.getAffiliations(LocationType.PACKAGE).length).toEqual(0);
    });

    it('should add affiliations correctly', async () => {
      // PACKAGE
      expectedLocation.addAffiliation(secondLocation);
      const packageAffiliations = expectedLocation.getAffiliations(LocationType.PACKAGE);

      // CITY
      const cityLocation = Location.create({
        slug: 'location-city-ny',
        extId: 'location-city-ny',
        type: LocationType.CITY,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(cityLocation);

      // ZIPCODE
      const zipCodeLocation = Location.create({
        slug: 'location-zipCode-ny',
        extId: 'location-zipCode-ny',
        type: LocationType.ZIPCODE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      zipCodeLocation.addAffiliation(cityLocation);
      cityLocation.addAffiliation(zipCodeLocation);
      const cityAffiliations = zipCodeLocation.getAffiliations(LocationType.CITY);

      // STATE
      const stateLocation = Location.create({
        slug: 'location-state-ny',
        extId: 'location-state-ny',
        type: LocationType.STATE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      cityLocation.addAffiliation(stateLocation);
      const stateAffiliations = cityLocation.getAffiliations(LocationType.STATE);

      // COUNTRY
      const countryLocation = Location.create({
        slug: 'location-country-us',
        extId: 'location-country-us',
        type: LocationType.COUNTRY,
        name: 'US',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(countryLocation);
      const countryAffiliations = expectedLocation.getAffiliations(LocationType.COUNTRY);

      expect(packageAffiliations.length).toEqual(0);
      expect(countryAffiliations.length).toEqual(1);
      expect(countryAffiliations[0]).toEqual(countryLocation);
      expect(stateAffiliations.length).toEqual(1);
      expect(stateAffiliations[0]).toEqual(stateLocation);
      expect(cityAffiliations.length).toEqual(1);
      expect(cityAffiliations[0]).toEqual(cityLocation);
    });

    it('should get empty array', () => {
      expect(expectedLocation.getAffiliations(9999 as unknown as LocationType)).toEqual([]);
    });
  });

  describe('clearAffiliations', () => {
    it('should clear affiliations', async () => {
      expect(secondLocation.countries).toEqual(undefined);
      expect(secondLocation.states).toEqual(undefined);
      expect(secondLocation.cities).toEqual(undefined);
      expect(secondLocation.zipCodes).toEqual(undefined);
      expect(secondLocation.packages).toEqual([]);
      // PACKAGE
      expectedLocation.addAffiliation(secondLocation);

      // COUNTRY
      const countryLocation = Location.create({
        slug: 'location-country-us',
        extId: 'location-country-us',
        type: LocationType.COUNTRY,
        name: 'US',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(countryLocation);

      // STATE
      const stateLocation = Location.create({
        slug: 'location-state-ny',
        extId: 'location-state-ny',
        type: LocationType.STATE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(stateLocation);

      // CITY
      const cityLocation = Location.create({
        slug: 'location-city-ny',
        extId: 'location-city-ny',
        type: LocationType.CITY,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(cityLocation);

      // ZIPCODE
      const zipCodeLocation = Location.create({
        slug: 'location-zipCode-ny',
        extId: 'location-zipCode-ny',
        type: LocationType.ZIPCODE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(zipCodeLocation);

      expectedLocation.clearAffiliations();
      expect(expectedLocation.countries?.length).toEqual(0);
      expect(expectedLocation.states).toEqual(undefined);
      expect(expectedLocation.cities).toEqual(undefined);
      expect(expectedLocation.zipCodes).toEqual(undefined);
      expect(expectedLocation.packages?.length).toEqual(0);

      cityLocation.addAffiliation(zipCodeLocation);
      cityLocation.addAffiliation(stateLocation);
      cityLocation.clearAffiliations();
      expect(cityLocation.states?.length).toEqual(0);

      zipCodeLocation.addAffiliation(cityLocation);
      zipCodeLocation.clearAffiliations();
      expect(zipCodeLocation.cities?.length).toEqual(0);

      secondLocation.clearAffiliations();
      expect(secondLocation.packages).toEqual([]);
    });
  });
});
