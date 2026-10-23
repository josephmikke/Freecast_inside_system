export namespace AutoIngestionError {
  export class AutoIngestionAlreadyExist extends Error {}
  export class AutoIngestionNotFound extends Error {}
  export class UnknownAutoIngestionDependency extends Error {}
  export class UnableToCreateSchedule extends Error {}
  export class UnableToDeleteSchedule extends Error {}
}
