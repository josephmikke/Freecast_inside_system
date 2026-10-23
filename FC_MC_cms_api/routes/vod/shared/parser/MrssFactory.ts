import { GenericObject } from '../../../epg/shared/IParser';
import {
  MrssAsset,
  MrssAssetFields,
  MrssEpisode,
  MrssMappingTemplate,
  MrssMovie,
  MrssSeries,
  MrssSubTitle,
  MrssSubTitleFields,
  MrssThumbnail,
  MrssThumbnailFields,
  MrssType,
} from '../../../shared/dto/MrssDto';

import { IMrssFactory } from './IMrssFactory';
import { IMrssPath } from './IMrssPath';
import { MRSSError } from './MRSSError';

export default class MrssFactory implements IMrssFactory<GenericObject, MrssMappingTemplate> {
  constructor(protected readonly mrssPath: IMrssPath<GenericObject>) {
  }

  protected static checkNotEmptyString(str: string) {
    return str !== '';
  }

  protected static checkAttributes<T extends Object>(
    obj: GenericObject,
    attributes: string[],
    field: string,
  ): asserts obj is T {
    attributes.forEach((attribute) => {
      if (obj[attribute] === undefined) {
        throw new MRSSError.MissingAttribute(`${attribute} attributes from ${field} field is missing or undefined`);
      }
    });
  }

  protected static checkArrayAttributes<T extends Array<GenericObject>>(
    obj: GenericObject[],
    attributes: string[],
    field: string,
  ): asserts obj is T {
    attributes.forEach((attribute) => {
      obj.forEach((item) => {
        if (item[attribute] === undefined) throw new MRSSError.MissingAttribute(`${attribute} attributes from ${field} field is missing or undefined`);
      });
    });
  }

  protected static checkEmptyField(value: string, field: string) {
    if (value === '') throw new MRSSError.EmptyValue(`${field} returns an empty value while a non-empty or undefined is required`);
  }

  createSeries(attr: GenericObject, mappingTemplate: MrssMappingTemplate): MrssSeries {
    const title = this.mrssPath.select(attr, mappingTemplate.title);
    const description = this.mrssPath.select(attr, mappingTemplate.description);
    const pubDate = this.mrssPath.select(attr, mappingTemplate.pubDate);
    const guid = this.mrssPath.select(attr, mappingTemplate.guid);
    const extId = this.mrssPath.select(attr, mappingTemplate.extId);
    const cast = this.mrssPath.selectStrings(attr, mappingTemplate.cast);
    const thumbnails = this.mrssPath.selectArray(attr, mappingTemplate.thumbnails);
    const subtitles = this.mrssPath.selectArray(attr, mappingTemplate.subtitle);
    const rating = this.mrssPath.select(attr, mappingTemplate.rating);
    const rotationStart = this.mrssPath.select(attr, mappingTemplate.rotationStart);
    const rotationEnd = this.mrssPath.select(attr, mappingTemplate.rotationEnd);
    const genres = this.mrssPath.select(attr, mappingTemplate.genres).split(/\s*,\s*/).filter(MrssFactory.checkNotEmptyString);
    const seriesMainThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.seriesMainThumbnail);
    const seriesAltThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.seriesAltThumbnail);
    const seriesBackgroundThumbnail = this.mrssPath
      .selectMap(attr, mappingTemplate.seriesBackgroundThumbnail);
    MrssFactory.checkArrayAttributes<MrssThumbnail[]>(
      thumbnails,
      MrssThumbnailFields,
      mappingTemplate.thumbnails,
    );
    MrssFactory.checkArrayAttributes<MrssSubTitle[]>(
      subtitles,
      MrssSubTitleFields,
      mappingTemplate.subtitle,
    );
    MrssFactory.checkEmptyField(title, mappingTemplate.title);
    MrssFactory.checkEmptyField(description, mappingTemplate.description);
    // MrssFactory.checkEmptyField(pubDate, mappingTemplate.pubDate);
    MrssFactory.checkEmptyField(guid, mappingTemplate.guid);
    MrssFactory.checkEmptyField(rotationStart, mappingTemplate.rotationStart);
    MrssFactory.checkEmptyField(rotationEnd, mappingTemplate.rotationEnd);
    return {
      avail: {
        start: rotationStart,
        end: rotationEnd,
      },
      description,
      extId,
      guid,
      pubDate,
      thumbnails,
      title,
      type: MrssType.SERIES,
      cast,
      genres,
      rating,
      seriesMainThumbnail,
      seriesAltThumbnail,
      seriesBackgroundThumbnail,
    };
  }

  createMovie(attr: GenericObject, mappingTemplate: MrssMappingTemplate): MrssMovie {
    const title = this.mrssPath.select(attr, mappingTemplate.title);
    const asset = this.mrssPath.selectMap(attr, mappingTemplate.asset);
    const description = this.mrssPath.select(attr, mappingTemplate.description);
    const pubDate = this.mrssPath.select(attr, mappingTemplate.pubDate);
    const guid = this.mrssPath.select(attr, mappingTemplate.guid);
    const extId = this.mrssPath.select(attr, mappingTemplate.extId);
    const rotationStart = this.mrssPath.select(attr, mappingTemplate.rotationStart);
    const rotationEnd = this.mrssPath.select(attr, mappingTemplate.rotationEnd);
    const cast = mappingTemplate.cast ? this.mrssPath.select(attr, mappingTemplate.cast).split(',')
      .map((item) => item.trim()) : [];
    const cuePoints = mappingTemplate.cuePoints ? this.mrssPath.select(attr, mappingTemplate.cuePoints).split(',')
      .map((item) => item.trim()) : [];
    const thumbnails = this.mrssPath.selectArray(attr, mappingTemplate.thumbnails);
    const subtitles = this.mrssPath.selectArray(attr, mappingTemplate.subtitle);
    const rating = this.mrssPath.select(attr, mappingTemplate.rating);
    const movieMainThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.movieMainThumbnail);
    const movieAltThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.movieAltThumbnail);
    const movieBackgroundThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.movieBackgroundThumbnail);
    const genres = this.mrssPath.select(attr, mappingTemplate.genres).split(/\s*,\s*/).filter(MrssFactory.checkNotEmptyString);
    MrssFactory.checkAttributes<MrssAsset>(asset, MrssAssetFields, mappingTemplate.asset);
    MrssFactory.checkArrayAttributes<MrssThumbnail[]>(
      thumbnails,
      MrssThumbnailFields,
      mappingTemplate.thumbnails,
    );
    MrssFactory.checkArrayAttributes<MrssSubTitle[]>(
      subtitles,
      MrssSubTitleFields,
      mappingTemplate.subtitle,
    );
    MrssFactory.checkEmptyField(title, mappingTemplate.title);
    MrssFactory.checkEmptyField(description, mappingTemplate.description);
    // MrssFactory.checkEmptyField(pubDate, mappingTemplate.pubDate);
    MrssFactory.checkEmptyField(guid, mappingTemplate.guid);
    MrssFactory.checkEmptyField(rotationStart, mappingTemplate.rotationStart);
    MrssFactory.checkEmptyField(rotationEnd, mappingTemplate.rotationEnd);
    return {
      avail: {
        start: rotationStart,
        end: rotationEnd,
      },
      cuePoints,
      subtitles,
      asset,
      title,
      description,
      thumbnails,
      extId,
      guid,
      pubDate,
      type: MrssType.MOVIE,
      cast,
      genres,
      rating,
      movieMainThumbnail,
      movieAltThumbnail,
      movieBackgroundThumbnail,
    };
  }

  createEpisode(attr: GenericObject, mappingTemplate: MrssMappingTemplate): MrssEpisode {
    const title = this.mrssPath.select(attr, mappingTemplate.title);
    const asset = this.mrssPath.selectMap(attr, mappingTemplate.asset);
    const description = this.mrssPath.select(attr, mappingTemplate.description);
    const pubDate = this.mrssPath.select(attr, mappingTemplate.pubDate);
    const guid = this.mrssPath.select(attr, mappingTemplate.guid);
    const extId = this.mrssPath.select(attr, mappingTemplate.extId);
    const episode = this.mrssPath.select(attr, mappingTemplate.episodeNum);
    const seriesId = this.mrssPath.select(attr, mappingTemplate.seriesId);
    const season = this.mrssPath.select(attr, mappingTemplate.seasonNum);
    const rotationStart = this.mrssPath.select(attr, mappingTemplate.rotationStart);
    const rotationEnd = this.mrssPath.select(attr, mappingTemplate.rotationEnd);
    const cast = mappingTemplate.cast ? this.mrssPath.select(attr, mappingTemplate.cast).split(',')
      .map((item) => item.trim()) : [];
    const cuePoints = mappingTemplate.cuePoints ? this.mrssPath.select(attr, mappingTemplate.cuePoints).split(',')
      .map((item) => item.trim()) : [];
    const thumbnails = this.mrssPath.selectArray(attr, mappingTemplate.thumbnails);
    const subtitles = this.mrssPath.selectArray(attr, mappingTemplate.subtitle);
    const rating = this.mrssPath.select(attr, mappingTemplate.rating);
    const episodeMainThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.episodeMainThumbnail);
    const episodeAltThumbnail = this.mrssPath.selectMap(attr, mappingTemplate.episodeAltThumbnail);
    const genres = this.mrssPath.select(attr, mappingTemplate.genres).split(/\s*,\s*/).filter(MrssFactory.checkNotEmptyString);
    MrssFactory.checkAttributes<MrssAsset>(asset, MrssAssetFields, mappingTemplate.asset);
    MrssFactory.checkArrayAttributes<MrssThumbnail[]>(
      thumbnails,
      MrssThumbnailFields,
      mappingTemplate.thumbnails,
    );
    MrssFactory.checkArrayAttributes<MrssSubTitle[]>(
      subtitles,
      MrssSubTitleFields,
      mappingTemplate.subtitle,
    );
    MrssFactory.checkEmptyField(title, mappingTemplate.title);
    MrssFactory.checkEmptyField(description, mappingTemplate.description);
    // MrssFactory.checkEmptyField(pubDate, mappingTemplate.pubDate);
    MrssFactory.checkEmptyField(guid, mappingTemplate.guid);
    // MrssFactory.checkEmptyField(season, mappingTemplate.seasonNum);
    // MrssFactory.checkEmptyField(episode, mappingTemplate.episodeNum);
    MrssFactory.checkEmptyField(seriesId, mappingTemplate.seriesId);
    MrssFactory.checkEmptyField(rotationStart, mappingTemplate.rotationStart);
    MrssFactory.checkEmptyField(rotationEnd, mappingTemplate.rotationEnd);
    return {
      avail: {
        start: rotationStart,
        end: rotationEnd,
      },
      cuePoints,
      episode,
      season,
      seriesId,
      subtitles,
      asset,
      title,
      description,
      thumbnails,
      extId,
      guid,
      pubDate,
      type: MrssType.EPISODE,
      cast,
      genres,
      rating,
      episodeMainThumbnail,
      episodeAltThumbnail,
    };
  }
}
