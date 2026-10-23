// eslint-disable-next-line max-classes-per-file
export namespace PlatformError {
  export class PlatformAlreadyExist extends Error {
  }

  export class PlatformNotFound extends Error {
  }

  export class PlatformHasDependencies extends Error {}
}
