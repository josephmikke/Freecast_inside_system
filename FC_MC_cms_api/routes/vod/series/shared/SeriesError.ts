// eslint-disable-next-line max-classes-per-file
export namespace SeriesError {
  export class SeriesAlreadyExist extends Error {
  }

  export class SeriesNotFound extends Error {
  }

  export class SeriesHasDependencies extends Error {}

  export class UnknownSeriesDependency extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveSeries extends Error {}

  export class UnableToUpdateSeries extends Error {}
}
