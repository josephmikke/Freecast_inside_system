// eslint-disable-next-line max-classes-per-file
import { ValueObject } from '../interfaces/ValueObject';

export namespace HlsDestinationError {
  export class InvalidManifestKey extends Error {
  }
}

export default class HlsDestination implements ValueObject<HlsDestination> {
  constructor(private readonly hls: string) {
    if (!hls.includes('/hls/index.m3u8')) {
      throw new HlsDestinationError.InvalidManifestKey();
    }
  }

  equals(other: HlsDestination): boolean {
    return this.value() === other.value();
  }

  value(): string {
    return this.hls;
  }

  toJSON() {
    return `${process.env.ASSETS_URL}/${this.value()}`;
  }
}
