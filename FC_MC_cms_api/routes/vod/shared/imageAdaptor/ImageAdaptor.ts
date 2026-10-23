import drainResponse from '../../../epg/shared/drainResponse';
import { IHttpClient } from '../../../epg/shared/IHttpClient';
import { ValueObject } from '../../../shared/interfaces/ValueObject';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';

import { IImageAdaptor } from './IImageAdaptor';

export default class ImageAdaptor implements IImageAdaptor {
  private image?: ValueObject<Thumbnail> = undefined;

  constructor(
    private readonly httpClient: IHttpClient<Response>,
  ) {}

  async ingest(url: string): Promise<void> {
    try {
      console.log('url', url);
      const data = await this.httpClient.get(url);

      // Bail out before reading the body on an error response, otherwise the error page
      // itself gets base64-encoded and stored as the thumbnail. Drain it first so the
      // socket is released — an unread body holds its descriptor for the life of the
      // container, and MRSS ingestion fans out over every asset in the feed.
      if (data.status < 200 || data.status > 299) {
        await drainResponse(data);
        throw new Error(`thumbnail fetch failed with status ${data.status}`);
      }

      // Strip any `; charset=...` parameter so the data URI we persist stays canonical.
      const mimeType = data.headers.get('content-type')?.split(';')[0].trim();
      const contentType = !mimeType || mimeType.includes('octet-stream')
        ? 'image/png'
        : mimeType;
      console.log('contentType', contentType);
      this.image = new Thumbnail(`data:${contentType};base64,${Buffer.from(await data.arrayBuffer()).toString('base64')}`);
    } catch (err) {
      console.log('ingest url', url);
      console.log('image adaptor err', err);
      this.image = new Thumbnail(process.env.NO_THUMBNAIL_URL!);
    }
  }

  value(): string {
    return this.image?.value() ?? '';
  }
}
