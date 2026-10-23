// eslint-disable-next-line max-classes-per-file
export namespace GeoIpRuleError {
  export class GeoIpRule extends Error {}

  export class IPSetsNotFound extends Error {}

  export class NotFound extends Error {}

  export class UnableToDeleteIpSet extends Error {}
}
