import { MrssSubTitle } from '../../shared/dto/MrssDto';

export interface ITranscoder {
  transcode(
    ingestionId: string,
    entityId: string,
    media: string,
    mrssUrl: string,
    isPrivate: boolean,
    retries: number,
    cuePoints?: Array<string>,
    subtitles?: Array<MrssSubTitle>,
  ): Promise<boolean>;
}
