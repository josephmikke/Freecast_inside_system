import { setTimeout } from 'timers/promises';

import {
  MediaConvertClient,
  CreateJobCommand,
  CreateJobCommandInput,
  TooManyRequestsException,
  AccelerationMode,
} from '@aws-sdk/client-mediaconvert';

import { MrssSubTitle } from '../../../shared/dto/MrssDto';
import { IEsamGenerator } from '../IEsamGenerator';
import { ITranscoder } from '../ITranscoder';

import jobInput from './assets/jobTemplate.json';
import { MediaConvertError } from './MediaConvertTranscoderError';

export default class MediaConvertTranscoder implements ITranscoder {
  constructor(
    private readonly client: MediaConvertClient,
    private readonly esamXmlAdaptor: IEsamGenerator,
    private readonly destinationBucket: string,
    private readonly roleArn: string,
    private readonly queueArn?: string,
  ) {}

  private static MAX_RETRIES = 30;

  private static BASE_DELAY_IN_MS = 1000;

  private getLanguageCode = (lang: string): string => {
    if (lang.includes('-')) {
      const parts = lang.split('-');
      const secondPart = parts[1]?.toUpperCase();
      if (secondPart && secondPart.length === 3) {
        return secondPart;
      }
    }

    const langMap: { [key: string]: string } = {
      'en': 'ENG',
      'es': 'SPA',
      'fr': 'FRA',
      'de': 'DEU',
      'nl': 'NLD',
      'pt': 'POR',
      'it': 'ITA',
    };

    const langCode = lang.split('-')[0]?.toLowerCase();
    return langMap[langCode] || 'ENG';
  };

  private getLanguageName = (lang: string): string => {
    const langNameMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'nl': 'Dutch',
      'pt': 'Portuguese',
      'it': 'Italian',
    };

    const langCode = lang.split('-')[0]?.toLowerCase();
    return langNameMap[langCode] || 'English';
  };

  private getSubtitleType = (subtitle: MrssSubTitle) => {
    const captionSelector = {
      CustomLanguageCode: this.getLanguageCode(subtitle.lang),
      SourceSettings: {
        SourceType: '[replaced]',
        FileSourceSettings: {
          SourceFile: subtitle.href,
        },
      },
    };
    const options = {
      'text/webvtt': {
        ...captionSelector,
        SourceSettings: {
          ...captionSelector.SourceSettings,
          SourceType: 'WEBVTT',
        },
      },
      'text/vtt': {
        ...captionSelector,
        SourceSettings: {
          ...captionSelector.SourceSettings,
          SourceType: 'WEBVTT',
        },
      },
      'text/srt': {
        ...captionSelector,
        SourceSettings: {
          ...captionSelector.SourceSettings,
          SourceType: 'SRT',
        },
      },
      'application/x-subrip': {
        ...captionSelector,
        SourceSettings: {
          ...captionSelector.SourceSettings,
          SourceType: 'SRT',
        },
      },
      default: undefined,
    };

    if (options[subtitle.type as keyof typeof options]) {
      return options[subtitle.type as keyof typeof options];
    }
    return options.default;
  };

  async transcode(
    ingestionId: string,
    entityId: string,
    media: string,
    mrssUrl: string,
    isPrivate: boolean = false,
    retries: number = 0,
    cuePoints?: Array<string>,
    subtitles?: Array<MrssSubTitle>,
  ) : Promise<boolean> {
    try {
      const s3UrlMatches = media.match(/^https?:\/\/(.+(?=\.s3[.-])).+((?<=\.amazonaws\.com\/).+)$/);
      const captionsSelectorsSetting: { [key: string]: any } = {};
      const captionInputSetting: Array<Object> = [];

      await Promise.all(subtitles?.map(async (subtitle, i) => {
        if (this.getSubtitleType(subtitle)) {
          captionsSelectorsSetting[`Captions Selector ${i + 1}`] = this.getSubtitleType(subtitle);
          captionInputSetting.push({
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                Scte35Source: 'PASSTHROUGH'
              }
            },
            OutputSettings: {
              HlsSettings: {}
            },
            NameModifier: `_caption${i}`,
            CaptionDescriptions: [
              {
                CaptionSelectorName: `Captions Selector ${i + 1}`,
                LanguageCode: this.getLanguageCode(subtitle.lang),
                LanguageDescription: this.getLanguageName(subtitle.lang),
                DestinationSettings: {
                  DestinationType: 'WEBVTT',
                  WebvttDestinationSettings: {}
                }
              }
            ]
          })
        } 
      }) ?? []);

      const jobCommandInput = {
        ...jobInput,
        Queue: this.queueArn,
        Role: this.roleArn,
        AccelerationSettings: {
          Mode: AccelerationMode.DISABLED,
        },
        UserMetadata: {
          ingestionId,
          entityId,
          media: media.split('?')[0],
          ingestionUrl: mrssUrl.length > 250 ? mrssUrl.slice(0, 250) : mrssUrl,
        },
        Settings: {
          ...jobInput.Settings,
          Inputs: await Promise.all(
            jobInput.Settings.Inputs?.map((input) => ({
              ...input,
              CaptionSelectors: Object.keys(captionsSelectorsSetting).length > 0
                ? captionsSelectorsSetting : undefined,
              FileInput: isPrivate && s3UrlMatches !== null && s3UrlMatches.length >= 3
                ? `s3://${s3UrlMatches[1]}/${s3UrlMatches[2]}`
                : media,
            })) ?? [],
          ),
          OutputGroups: await Promise.all(
            jobInput.Settings.OutputGroups?.map((output) => ({
              ...output,
              Outputs: [
                ...output.Outputs,
                ...captionInputSetting
              ],
              OutputGroupSettings: {
                ...output.OutputGroupSettings,
                HlsGroupSettings: {
                  ...output.OutputGroupSettings?.HlsGroupSettings,
                  Destination: `s3://${this.destinationBucket}/${entityId}/vod/`,
                },
              },
            })) ?? [],
          ),
          Esam: await cuePoints?.length
            ? {
              ResponseSignalPreroll: 0,
              SignalProcessingNotification: {
                SccXml: this.esamXmlAdaptor.generateScc(cuePoints ?? []),
              },
              ManifestConfirmConditionNotification: {
                MccXml: await this.esamXmlAdaptor.generateMcc(cuePoints ?? []),
              },
            } : undefined,
        },
      } as CreateJobCommandInput;

      console.log("~~~~~~~~~~~~~MediaConvertJob~~~~~~~~~~~~~", jobCommandInput);
      console.log(JSON.stringify(jobCommandInput, null, 2));

      return !!await this.client.send(new CreateJobCommand(jobCommandInput));
    } catch (err) {
      console.error(err);
      switch (true) {
        case err instanceof TooManyRequestsException:
          if (retries < MediaConvertTranscoder.MAX_RETRIES) {
            console.warn(`retrying ${retries} time`);
            await setTimeout(retries * MediaConvertTranscoder.BASE_DELAY_IN_MS);
            return this.transcode(
              ingestionId,
              entityId,
              media,
              mrssUrl,
              isPrivate,
              // eslint-disable-next-line no-param-reassign,no-plusplus
              retries++,
              cuePoints,
              subtitles,
            );
          }
          return false;
          break;
        default:
          throw new MediaConvertError.UnableToCreateJob(err);
      }
    }
  }
}
