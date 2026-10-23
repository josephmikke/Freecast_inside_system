// eslint-disable-next-line max-classes-per-file
export namespace GenreError {
  export class GenreAlreadyExist extends Error {
  }

  export class GenreNotFound extends Error {
  }

  export class GenreHasDependencies extends Error {}
}
