import { MovieRating } from '../../asset/shared/Rating';

import { IEPGProgramBuilder } from './IEPGProgramBuilder';
import { EPGProgram } from './IParser';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class EPGProgramBuilder implements IEPGProgramBuilder<EPGProgram> {
  private readonly epg: EPGProgram;

  constructor(public readonly uid: UID) {
    this.epg = {
      id: uid.generate(8),
      subtitle: null,
      thumbnail: null,
      alternateThumbnail: null,
      catchup: false,
      rating: null,
      archive: false,
      description: '',
      duration: '',
      end_time: '',
      ext_id: '',
      slug: '',
      start_time: '',
      title: '',
    };
  }

  create(uid?: UID) {
    return new EPGProgramBuilder(uid || this.uid);
  }

  addExtId(extId: string): this {
    this.epg.ext_id = extId;
    return this;
  }

  addDuration(duration: string): this {
    this.epg.duration = duration;
    return this;
  }

  addThumbnail(thumbnail: string): this {
    this.epg.thumbnail = thumbnail;
    return this;
  }

  addAlternateThumbnail(thumbnail: string): this {
    this.epg.alternateThumbnail = thumbnail;
    return this;
  }

  setCatchup(value: boolean): this {
    this.epg.catchup = value;
    return this;
  }

  setArchive(value: boolean): this {
    this.epg.archive = value;
    return this;
  }

  setRating(rating: MovieRating): this {
    this.epg.rating = rating;
    return this;
  }

  addTitle(title: string) {
    this.epg.title = title;
    return this;
  }

  addDescription(description: string) {
    this.epg.description = description;
    return this;
  }

  addStartTime(startTime: string) {
    this.epg.start_time = startTime;
    return this;
  }

  addSlug(slug: string) {
    this.epg.slug = slug;
    return this;
  }

  getResult(): EPGProgram {
    return this.epg;
  }

  addSubtitle(subtitle: string) {
    this.epg.subtitle = subtitle;
    return this;
  }

  addEndTime(endTime: string): this {
    this.epg.end_time = endTime;
    return this;
  }
}
