// eslint-disable-next-line max-classes-per-file
import { MediaPackageClient, DescribeChannelCommand } from '@aws-sdk/client-mediapackage';

import { ValueObject } from '../interfaces/ValueObject';

export namespace MediaPackageIdError {
  export class InvalidMediaPackageId extends Error {
  }
}

/**
 * Shared across every MediaPackageId instance on purpose. An AWS SDK client owns an
 * https.Agent configured with `keepAlive: true` and no idle timeout, so a client created
 * per value object parks a TLS socket that is never reclaimed — one leaked file descriptor
 * per channel, per invocation, until the Lambda container hits EMFILE.
 *
 * DescribeChannel is quota limited and a single channel listing validates every channel in
 * parallel, so the default 3 attempts are not enough to absorb a burst of throttles.
 */
const client = new MediaPackageClient({ maxAttempts: 5 });

/**
 * Memoised per container for the same reason: a listing of N channels would otherwise issue
 * N DescribeChannel calls on every request. Only successful lookups are cached — caching a
 * failure would keep a freshly created MediaPackage channel "invalid" for the whole TTL.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const validatedAt = new Map<string, number>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * The only responses that say something about the id itself. Anything else — throttling,
 * timeouts, expired credentials — is a failure to answer the question, not an answer.
 */
const NOT_FOUND_ERRORS = ['NotFoundException', 'UnprocessableEntityException', 'ValidationException'];

export default class MediaPackageId implements ValueObject<MediaPackageId> {
  private readonly id: string;

  /**
   * The memo above is process-wide, so it survives between test cases and would otherwise
   * let an id validated by one case short-circuit the client mock set up by the next.
   */
  public static resetValidationCache(): void {
    validatedAt.clear();
    inFlight.clear();
  }

  private static describesMissingChannel(err: any): boolean {
    return NOT_FOUND_ERRORS.includes(err?.name) || err?.$metadata?.httpStatusCode === 404;
  }

  public async isValid(): Promise<boolean> {
    if (this.id.length === 0) return true;

    const cachedAt = validatedAt.get(this.id);
    if (cachedAt !== undefined && Date.now() - cachedAt < CACHE_TTL_MS) return true;

    try {
      let pending = inFlight.get(this.id);
      if (pending === undefined) {
        pending = client.send(new DescribeChannelCommand({ Id: this.id }));
        inFlight.set(this.id, pending);
        // Settle silently first so a rejection here is never an unhandled rejection.
        pending.then(() => {}, () => {}).then(() => inFlight.delete(this.id));
      }
      await pending;
      validatedAt.set(this.id, Date.now());
      return true;
    } catch (err) {
      if (!MediaPackageId.describesMissingChannel(err)) throw err;
      throw new MediaPackageIdError.InvalidMediaPackageId('MediaPackageId is invalid.');
    }
  }

  constructor(value: string) {
    this.id = value;
  }

  public value(): string {
    return this.id;
  }

  public equals(other: MediaPackageId): boolean {
    return this.value() === other.value();
  }

  public toJSON() {
    return this.value();
  }
}
