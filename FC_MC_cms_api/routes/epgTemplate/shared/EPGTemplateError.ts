// eslint-disable-next-line max-classes-per-file
export namespace EPGTemplateError {
  export class EPGTemplateAlreadyExist extends Error {
  }

  export class EPGTemplateNotFound extends Error {
  }

  export class EPGTemplateHasDependencies extends Error {}
}
