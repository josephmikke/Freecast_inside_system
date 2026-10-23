// eslint-disable-next-line max-classes-per-file
export namespace MovieError {
  export class MovieAlreadyExist extends Error {
  }

  export class MovieNotFound extends Error {
  }

  export class MovieHasDependencies extends Error {}

  export class UnknownMovieDependency extends Error {}

  export class MovieStreamCreation extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveMovie extends Error {}

  export class UnableToUpdateMovie extends Error {}
}
