import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export interface IEPGProgramBuilder<T> {
  uid: UID,
  addTitle(value: string): this;
  addSubtitle(value: string): this;
  addDescription(value: string): this
  addStartTime(value: string): this
  addEndTime(value: string): this
  addExtId(value: string): this
  addSlug(value: string): this
  addDuration(value: string): this
  addThumbnail(value: string): this
  addAlternateThumbnail(thumbnail: string): this
  setCatchup(value: boolean): this
  setArchive(value: boolean): this
  setRating(rating: string): this
  create(uid?: UID): IEPGProgramBuilder<T>;
  getResult(): T
}
