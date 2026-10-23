import CIDR, { CidrError } from '../valueObjects/CIDR';

import InvalidCidrExpression = CidrError.InvalidCidrExpression;

describe('CIDR ValueObject', () => {
  describe('Valid CIDR', () => {
    it('should create a CIDR', () => {
      // Arrange
      const range = '10.0.0.1/24';

      // Act
      const cidr = new CIDR(range);
      const value = cidr.value();

      // Assert
      expect(value).toEqual(range);
    });

    it('should return CIDR JSON object', () => {
      // Arrange
      const range = '10.0.0.1/24';

      // Act
      const cidr = new CIDR(range);
      const jsonObject = {
        ...cidr,
      };

      // Assert
      expect(jsonObject).toStrictEqual({ cidr: range });
    });

    it('should compare two CIDR and be falsy', () => {
      // Arrange
      const firstRange = '10.0.0.1/24';
      const secondRange = '192.168.1.10/16';

      // Act
      const firstCidr = new CIDR(firstRange);
      const secondCidr = new CIDR(secondRange);
      const isEqual = firstCidr.equals(secondCidr);

      // Assert
      expect(isEqual).toBeFalsy();
    });

    it('should compare two CIDR and be truthy', () => {
      // Arrange
      const range = '10.0.0.1/24';

      // Act
      const firstCidr = new CIDR(range);
      const secondCidr = new CIDR(range);
      const isEqual = firstCidr.equals(secondCidr);

      // Assert
      expect(isEqual).toBeTruthy();
    });

    it('toJSON should return CIDR value', () => {
      // Arrange
      const range = '10.0.0.1/24';

      // Act
      const cidr = new CIDR(range);

      // Assert
      expect(cidr.toJSON()).toEqual(range);
    });
  });

  describe('Invalid CIDR', () => {
    it('should throw an InvalidCidrExpression error', () => {
      // Arrange
      const incompleteIp = '10.0.0.';
      const invalidMask = '10.0.0.1/200';
      const invalidIpv4 = '1000.1.1';

      // Act & Assert
      expect(() => new CIDR(incompleteIp)).toThrow(InvalidCidrExpression);
      expect(() => new CIDR(invalidMask)).toThrow(InvalidCidrExpression);
      expect(() => new CIDR(invalidIpv4)).toThrow(InvalidCidrExpression);
    });
  });
});
