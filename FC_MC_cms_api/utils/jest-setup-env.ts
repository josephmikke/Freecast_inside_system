/**
 * Environment variables that Lambda receives from sls-resources/environment.yml.
 *
 * Tests that build their dependencies the way the composition roots do read these from
 * process.env, which is empty under Jest — leaving the repository with an undefined base
 * url. These are the same public production endpoints the yml declares.
 *
 * Assigned only when unset, so an exported value still wins.
 */
process.env.DISTRIBUTORS_ENDPOINT = process.env.DISTRIBUTORS_ENDPOINT
  ?? 'https://api-services.freecast.com/affiliates/api/distributors/';
process.env.BRANDS_ENDPOINT = process.env.BRANDS_ENDPOINT
  ?? 'https://api-services.freecast.com/branding/api/v0/brands/';
process.env.NO_THUMBNAIL_URL = process.env.NO_THUMBNAIL_URL
  ?? 'default/nothumbnail/thumbnail.png';
