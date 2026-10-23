import { Rating } from '../../../asset/shared/Rating';
import { EpisodeDto } from '../../../shared/dto/vod/EpisodeDto';
import { VodType, IVod } from '../../../shared/dto/vod/VodDto';
import Asset from '../../../shared/interfaces/Asset';
import { ValueObject } from '../../../shared/interfaces/ValueObject';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import Stream from '../../../stream/shared/Stream';

type OmittedEpisodeProps = Omit<EpisodeDto, 'id' | 'streams' | 'alternateThumbnail'>;

// `mediapackageIds` is optional on the DTO and defaulted by the entity, so it is
// excluded from the Required<> wrapper that makes every other field mandatory.
type EpisodeCreateProps = Required<Omit<OmittedEpisodeProps, 'mediapackageIds'>>
  & Pick<OmittedEpisodeProps, 'mediapackageIds'>;

export default class Episode extends Asset implements IVod {
  public readonly type: VodType = VodType.EPISODE;

  public seriesId: string;

  public readonly extId: string;

  public readonly name: string;

  public readonly slug: string;

  public readonly season: string;

  public readonly number: number;

  public readonly duration: string;

  public readonly rating: Rating;

  public readonly description: string;

  public readonly originalAirDate: string;

  public readonly availableDate: string;

  public readonly expirationDate: string;

  public readonly contentData: string;

  public readonly cast: string;

  public readonly isIngest: boolean;

  public thumbnail: ValueObject<Thumbnail>;

  public alternateThumbnail?: ValueObject<Thumbnail>;

  public streams?: Array<Stream>;

  public mediapackageIds: Array<string>;

  private constructor(props: EpisodeCreateProps, id: string) {
    super(props, id);
    this.seriesId = props.seriesId;
    this.extId = props.extId;
    this.name = props.name;
    this.slug = props.slug;
    this.rating = props.rating;
    this.season = props.season;
    this.number = props.number;
    this.duration = props.duration;
    this.description = props.description;
    this.originalAirDate = props.originalAirDate;
    this.availableDate = props.availableDate;
    this.expirationDate = props.expirationDate;
    this.contentData = props.contentData;
    this.cast = props.cast;
    this.thumbnail = new Thumbnail(props.thumbnail);
    this.isIngest = props.isIngest;
    this.mediapackageIds = props.mediapackageIds ?? [];

    this.streams = [];
  }

  addStream(stream: Stream) {
    this.streams?.push(stream);
  }

  addMediapackageId(mediapackageId: string) {
    if (!this.mediapackageIds.includes(mediapackageId)) {
      this.mediapackageIds.push(mediapackageId);
    }
    return this;
  }

  updateThumbnail(path: string) {
    this.thumbnail = new Thumbnail(path);
    return this;
  }

  updateAlternateThumbnail(path: string) {
    this.alternateThumbnail = new Thumbnail(path);
    return this;
  }

  setSeriesId(id: string) {
    this.seriesId = id;
  }

  static create(props: EpisodeCreateProps, id: string): Episode {
    return new Episode(props, id);
  }
}
