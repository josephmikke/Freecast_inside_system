// eslint-disable-next-line max-classes-per-file
export namespace EPGError {
  export class EPGAlreadyExist extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveThumbnail extends Error {}

  export class UnableToUpdateProgram extends Error {}

  export class EPGNotFound extends Error {}

  export class EPGCannotBeDeleted extends Error {}

  export class EPGHasDependencies extends Error {}

  export class UnknownEPGDependency extends Error {}

  export class UnableToParseEPG extends Error {}

  export class UnableToFetchEPG extends Error {}

}
