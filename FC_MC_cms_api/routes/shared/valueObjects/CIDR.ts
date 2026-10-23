// eslint-disable-next-line max-classes-per-file
import { ValueObject } from '../interfaces/ValueObject';

export namespace CidrError {
  export class InvalidCidrExpression extends Error {
  }
}

export default class CIDR implements ValueObject<CIDR> {
  private static CIDR_REGEX = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

  constructor(private readonly cidr: string) {
    this.cidr = cidr;
    if (!CIDR.CIDR_REGEX.test(this.cidr)) {
      throw new CidrError.InvalidCidrExpression();
    }
  }

  equals(cidr: CIDR): boolean {
    return this.cidr === cidr.value();
  }

  value(): string {
    return this.cidr;
  }

  toJSON() {
    return this.value();
  }
}
