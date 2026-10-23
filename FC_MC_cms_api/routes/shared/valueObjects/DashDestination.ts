// eslint-disable-next-line max-classes-per-file
import { ValueObject } from '../interfaces/ValueObject';

export namespace DashDestinationError {
  export class InvalidManifestKey extends Error {
  }
}

export default class DashDestination implements ValueObject<DashDestination> {
  constructor(private readonly dash: string) {
    if (!dash.includes('/dash/index.mpd')) {
      throw new DashDestinationError.InvalidManifestKey();
    }
  }

  equals(other: DashDestination): boolean {
    return this.value() === other.value();
  }

  value(): string {
    return this.dash;
  }

  toJSON() {
    return `${process.env.ASSETS_URL}/${this.value()}`;
  }
}
