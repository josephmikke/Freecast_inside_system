import CountryCode, { CountryCodeError } from '../valueObjects/CountryCode';

import InvalidCountryCode = CountryCodeError.InvalidCountryCode;

describe('Country Code', () => {
  describe('Valid country code', () => {
    it('should create a country code', () => {
      // Arrange
      const id = 'FR';

      // Act
      const countryCode = new CountryCode(id);

      // Assert
      expect(countryCode.value()).toEqual(id);
    });

    it('should compare two country code and be falsy', () => {
      // Arrange
      const france = 'FR';
      const us = 'US';

      // Act
      const franceCountryCode = new CountryCode(france);
      const usCountryCode = new CountryCode(us);

      // Assert
      expect(franceCountryCode.equals(usCountryCode)).toBeFalsy();
    });

    it('should compare two country code and be falsy', () => {
      // Arrange
      const id = 'FR';

      // Act
      const firstCountryCode = new CountryCode(id);
      const secondCountryCode = new CountryCode(id);

      // Assert
      expect(firstCountryCode.equals(secondCountryCode)).toBeTruthy();
    });

    it('toJSON should return Country Code value', () => {
      // Arrange
      const id = 'FR';

      // Act
      const countryCode = new CountryCode(id);

      // Assert
      expect(countryCode.toJSON()).toEqual(id);
    });
  });

  describe('Invalid country code', () => {
    it('should throw InvalidCountryCode exception', () => {
      // Arrange
      const invalidCountryCode = '42';

      // Act & Assert
      expect(() => new CountryCode(invalidCountryCode)).toThrow(InvalidCountryCode);
    });
  });
});
