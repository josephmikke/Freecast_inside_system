// eslint-disable-next-line max-classes-per-file
export namespace CategoryError {
  export class CategoryAlreadyExist extends Error {
  }

  export class CategoryNotFound extends Error {
  }

  export class CategoryHasDependencies extends Error {}
}
