// eslint-disable-next-line max-classes-per-file
export namespace PackageError {
  export class PackageAlreadyExist extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveThumbnail extends Error {}

  export class PackageNotFound extends Error {}

  export class PackageHasDependencies extends Error {}

  export class UnknownPackageDependency extends Error {}
}
