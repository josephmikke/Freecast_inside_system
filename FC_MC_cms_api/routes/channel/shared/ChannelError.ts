// eslint-disable-next-line max-classes-per-file
export namespace ChannelError {
  export class ChannelAlreadyExist extends Error {
  }

  export class ChannelNotFound extends Error {
  }

  export class ChannelHasDependencies extends Error {}

  export class UnknownChannelDependency extends Error {}

  export class ChannelStreamCreation extends Error {}

  export class UnableToSaveThumbnail extends Error {}

  export class UnableToRemoveChannel extends Error {}

  export class UnableToUpdateChannel extends Error {}
}
