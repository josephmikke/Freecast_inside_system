// eslint-disable-next-line max-classes-per-file
export namespace ProviderError {
  export class ProviderAlreadyExist extends Error {
  }

  export class ProviderNotFound extends Error {
  }

  export class ProviderHasDependencies extends Error {}
}
