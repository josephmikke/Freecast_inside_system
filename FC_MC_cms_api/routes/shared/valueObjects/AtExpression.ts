// eslint-disable-next-line max-classes-per-file
import { ValueObject } from '../interfaces/ValueObject';

export namespace AtExpressionError {
  export class InvalidAtExpression extends Error {
  }
}

export default class AtExpression implements ValueObject<AtExpression> {
  private static expression = /^(19|20)\d\d-(0[1-9]|1[012])-([012]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

  private readonly oneTimeScheduleExpression: string;

  constructor(value: string) {
    if (!AtExpression.expression.test(value)) {
      throw new AtExpressionError.InvalidAtExpression('Expected format: yyyy-mm-ddThh:mm:ss');
    }
    this.oneTimeScheduleExpression = `at(${value})`;
  }

  equals(other: AtExpression): boolean {
    return this.value() === other.value();
  }

  value(): string {
    return this.oneTimeScheduleExpression;
  }

  toJSON() {
    return this.value();
  }
}
