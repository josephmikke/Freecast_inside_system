// eslint-disable-next-line max-classes-per-file
import cron, { CronData } from 'cron-validate';
import { Err, Valid } from 'cron-validate/lib/result';
import { Options } from 'cron-validate/lib/types';

import { ValueObject } from '../interfaces/ValueObject';

export namespace CronTaskError {
  export class InvalidCronTaskExpression extends Error {
  }
}

export default class CronTask implements ValueObject<CronTask> {
  private readonly expression: Err<Options | CronData, string[]> | Valid<CronData, string[]>;

  constructor(value: string, preset?: string) {
    this.expression = cron(value, { preset: preset || 'default' });
    if (!this.expression.isValid()) {
      throw new CronTaskError.InvalidCronTaskExpression(this.expression.getError().toString());
    }
  }

  public value(): string {
    const {
      hours, daysOfMonth, daysOfWeek, months, minutes, years,
    } = this.expression.getValue();
    return `${minutes} ${hours} ${daysOfMonth} ${months} ${daysOfWeek} ${years}`;
  }

  public equals(other: CronTask): boolean {
    return this.value() === other.value();
  }

  public toJSON() {
    return this.value();
  }
}
