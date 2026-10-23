// eslint-disable-next-line max-classes-per-file
export namespace IngestionError {
  export class IngestionNotFound extends Error {}
  export class CannotStartIngestion extends Error {}
  export class IngestionFailure extends Error {}
  export class IngestionCreationFailure extends Error {}
}
