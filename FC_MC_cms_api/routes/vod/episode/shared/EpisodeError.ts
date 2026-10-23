// eslint-disable-next-line max-classes-per-file
export namespace EpisodeError {
  export class EpisodeAlreadyExist extends Error {
  }

  export class EpisodeNotFound extends Error {
  }

  export class EpisodeHasDependencies extends Error {}

  export class UnknownEpisodeDependency extends Error {}

  export class EpisodeStreamCreation extends Error {}

  export class SeriesNotFound extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveEpisode extends Error {}

  export class UnableToUpdateEpisode extends Error {}
}
