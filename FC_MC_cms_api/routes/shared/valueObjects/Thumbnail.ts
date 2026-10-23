// eslint-disable-next-line max-classes-per-file
import { ValueObject } from '../interfaces/ValueObject';

export namespace ThumbnailError {
  export class InvalidThumbnail extends Error {
  }
}

export default class Thumbnail implements ValueObject<Thumbnail> {
  static UrlToRegex(url: string): string {
    return url.replace('.', '\\.');
  }

  /**
   * Anchored, so a value that merely mentions "base64" somewhere no longer passes as a data
   * URI — an HTML error page or a URL with base64 in its path used to slip through and get
   * persisted as a thumbnail. Deliberately tolerant about everything else: MIME parameters
   * (`;charset=utf-8`) and whitespace are accepted because upstream CDNs put them in the
   * content-type header, and values already stored must keep deserialising.
   */
  private static readonly BASE64_DATA_URI = /^data:[\w.+-]+\/[\w.+-]+(?:\s*;\s*[\w.+-]+\s*=\s*[^;,]*)*\s*;\s*base64\s*,[A-Za-z0-9+/=\s]*$/;

  protected readonly url: string;

  /**
   * Resolved once in the constructor. The pattern scans the whole data URI, which for an
   * inlined image runs to hundreds of kilobytes, and value()/toJSON() re-check it for every
   * item returned by the list endpoints.
   */
  private readonly base64: boolean;

  protected isBase64(): boolean {
    return this.base64;
  }

  protected isPath(): boolean {
    const thumbnailPathValidator = /(\w+\/[\w'-]+\/)+\w*-?thumbnail\.\w+$/gi;
    return thumbnailPathValidator.test(this.url);
  }

  protected isValid(): boolean {
    if (this.url.length === 0) return false;

    return this.isBase64() || this.isPath();
  }

  constructor(value: string) {
    this.url = value;
    this.base64 = Thumbnail.BASE64_DATA_URI.test(value);
    if (!this.isValid()) {
      console.log('invalid thumb', value);
      throw new ThumbnailError.InvalidThumbnail('Thumbnail is invalid.');
    }
    if (!this.base64 && this.isPath()) {
      this.url = `${process.env.ASSETS_URL}/${this.url}`;
    }
  }

  public value(): string {
    if (this.isBase64()) return this.url;
    const thumbnailPathValidator = /(\w+\/[\w'-]+\/)+\w*-?thumbnail\.\w+$/gi;

    const match = this.url.match(thumbnailPathValidator);
    if (match?.length) return match[0];
    return this.url;
  }

  public equals(other: Thumbnail): boolean {
    return this.value() === other.value();
  }

  public toJSON() {
    return this.isPath() ? this.url : this.value();
  }
}
