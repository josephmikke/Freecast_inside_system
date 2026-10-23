export interface MrssMappingTemplate {
  root: string;
  guid: string;
  extId: string;
  title: string;
  asset: string;
  thumbnails: string;
  description: string;
  subtitle: string;
  type: string;
  seriesId: string;
  seasonNum: string;
  episodeNum: string;
  pubDate: string;
  rotationStart: string;
  rotationEnd: string;
  rating: string;
  genres: string;
  cast: string;
  nextPage: string;
  cuePoints: string;
  seriesMainThumbnail: string;
  seriesAltThumbnail: string;
  seriesBackgroundThumbnail: string;
  movieMainThumbnail: string;
  movieAltThumbnail: string;
  movieBackgroundThumbnail: string;
  episodeMainThumbnail: string;
  episodeAltThumbnail: string;
}

export interface MrssSubTitle {
  type: string;
  lang: string;
  href: string;
}

export const MrssSubTitleFields = ['type', 'lang', 'href'];

export interface MrssThumbnail {
  width: string;
  height: string;
  url : string;
}

export const MrssThumbnailFields = ['height', 'width', 'url'];

export enum MrssType {
  SERIES = 'series',
  EPISODE = 'episode',
  MOVIE = '',
}

export interface MrssAvail {
  start: string;
  end: string;
}

export interface MrssAsset {
  height: string;
  width: string;
  duration: string;
  type: string;
  url: string;
}

export const MrssAssetFields = ['height', 'width', 'duration', 'type', 'url'];

export interface MrssBase {
  guid: string;
  extId?: string;
  title: string;
  thumbnails: MrssThumbnail[];
  pubDate: string;
  description: string;
  cast?: string[];
  genres: string[];
  type: MrssType;
  rating?: string;
  // brands?: string[];
  // distributors?: string[];
  // locations?: string[];
  // platforms?: string[];
}

export interface MrssSeries extends MrssBase {
  avail: MrssAvail;
  seriesMainThumbnail: MrssThumbnail | {};
  seriesAltThumbnail: MrssThumbnail | {};
  seriesBackgroundThumbnail: MrssThumbnail | {};
}

export interface MrssEpisode extends MrssBase {
  asset: MrssAsset;
  subtitles: MrssSubTitle[]
  cuePoints: string[];
  seriesId: string;
  season: string;
  episode: string;
  avail: MrssAvail;
  episodeMainThumbnail: MrssThumbnail | {};
  episodeAltThumbnail: MrssThumbnail | {};
}

export interface MrssMovie extends MrssBase {
  asset: MrssAsset;
  avail: MrssAvail;
  subtitles: MrssSubTitle[]
  cuePoints: string[];
  movieMainThumbnail: MrssThumbnail | {};
  movieAltThumbnail: MrssThumbnail | {};
  movieBackgroundThumbnail: MrssThumbnail | {};
}
