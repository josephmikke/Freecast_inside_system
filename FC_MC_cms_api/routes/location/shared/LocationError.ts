// eslint-disable-next-line max-classes-per-file
export namespace LocationError {
  export class LocationAlreadyExist extends Error {
  }

  export class LocationNotFound extends Error {
  }

  export class LocationHasDependencies extends Error {}

  export class UnknownLocationDependency extends Error {}
}
