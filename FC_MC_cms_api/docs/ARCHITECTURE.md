# FreeCast CMS API — Architecture & Developer Guide

> A detailed reference covering the system's purpose, structure, architecture, feature set, public interfaces, and how to start developing. For quick build/test commands see [`CLAUDE.md`](../CLAUDE.md); for deployment and DynamoDB access patterns see [`README.md`](../README.md).

---

## Table of Contents

1. [What This System Is](#1-what-this-system-is)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Repository Structure](#3-repository-structure)
4. [The Per-Route Architecture Pattern](#4-the-per-route-architecture-pattern)
5. [Shared Ports & Interfaces](#5-shared-ports--interfaces)
6. [Domain Model](#6-domain-model)
7. [Data Layer (DynamoDB Single-Table Design)](#7-data-layer-dynamodb-single-table-design)
8. [The Media Pipeline](#8-the-media-pipeline)
9. [Feature Set & HTTP API Surface](#9-feature-set--http-api-surface)
10. [Event-Driven & Scheduled Functions](#10-event-driven--scheduled-functions)
11. [Infrastructure (AWS Resources)](#11-infrastructure-aws-resources)
12. [Security & Auth](#12-security--auth)
13. [Observability](#13-observability)
14. [Getting Started](#14-getting-started)
15. [Deployment & CI/CD](#15-deployment--cicd)
16. [Developer Utilities](#16-developer-utilities)
17. [Conventions & Gotchas](#17-conventions--gotchas)

---

## 1. What This System Is

The FreeCast CMS API is a **fully serverless REST API** that powers content management for a streaming-media platform. It has two intertwined responsibilities:

1. **A metadata CMS** — CRUD management of ~20 business entities (channels, EPGs, VOD movies/series/episodes, packages, platforms, providers, categories, genres, locations, geo-IP rules, NPVR recordings, etc.), all persisted in a single DynamoDB table.
2. **A media supply chain** — automated ingestion of video content (from MRSS feeds and direct uploads), transcoding, DRM packaging, dynamic ad insertion, and global CDN delivery, orchestrated through AWS Step Functions and AWS Media Services.

The Channel / Movie / Series entities are where these two halves meet: editorial metadata managed via the API references media assets produced by the pipeline.

**Tech stack:** TypeScript (strict), Node.js 22.x, AWS Lambda, API Gateway, DynamoDB, Step Functions, the AWS Media Services suite (MediaConvert, MediaPackage, MediaTailor, MediaLive/MediaConnect), CloudFront, Cognito, EventBridge, SNS, Secrets Manager, WAF. Deployed with the **Serverless Framework v4** + esbuild.

---

## 2. High-Level Architecture

```
                          ┌──────────────────────────────┐
   API Key / Cognito ───▶ │   API Gateway (REST, /cms)   │
                          └───────────────┬──────────────┘
                                          │  (one Lambda per endpoint)
                          ┌───────────────▼──────────────┐
                          │   Route Lambdas (hexagonal)   │
                          │  index → Adaptor → Domain →   │
                          │           Repository          │
                          └───┬───────────────────────┬───┘
                              │                       │
                  ┌───────────▼─────────┐   ┌─────────▼──────────┐
                  │  DynamoDB cms-{stage}│   │  EventBridge bus    │
                  │  (single table+5 GSI)│   │  {stage}-cms        │
                  └──────────────────────┘   └─────────┬──────────┘
                                                        │ events
   MRSS feeds ─▶ scheduled ingest Lambdas ─▶ Step Functions (vodStateMachine)
                                                        │
                          MediaConvert ─▶ S3 ─▶ MediaPackage VOD (DRM/SPEKE)
                                                        │
                                          MediaTailor (VAST ad insertion)
                                                        │
                                            CloudFront (+ WAF) ─▶ players
```

Key architectural properties:

- **One Lambda per endpoint.** `package: individually: true` + esbuild bundles each function separately. CloudFormation stacks are split *per resource type* (`serverless-plugin-split-stacks`) to stay under CloudFormation's resource limits.
- **Hexagonal / clean architecture** inside every Lambda — the HTTP layer, business logic, and persistence are strictly separated by interfaces (ports).
- **Single-table DynamoDB design** — all entities share `cms-{stage}` with composite keys and 5 GSIs supporting the documented access patterns.
- **Event-driven media workflows** — ingestion and lifecycle transitions are driven by EventBridge events and Step Functions rather than synchronous calls.

---

## 3. Repository Structure

```
FC_MC_cms_api/
├── serverless.yml              # Service definition; imports all functions.yml & resources
├── tsconfig.json               # Strict TS; path remaps for the /opt layer
├── jest.config.ts              # ts-jest; moduleNameMapper for the /opt layer
├── .eslintrc.cjs               # airbnb-base + airbnb-typescript, strict import ordering
├── docker-compose.yml          # DynamoDB Local (port 8000) for tests
│
├── layers/
│   └── powertools/nodejs/      # AWS Lambda Layer (own package.json)
│       ├── Repository.ts       #   BaseRepository — generic DynamoDB access
│       └── UIDGenerator.ts     #   ID generation
│
├── routes/                     # The HTTP API — one folder per entity
│   ├── <entity>/
│   │   ├── functions.yml       #   Serverless function + event definitions
│   │   ├── <operation>/        #   One folder per operation (addX, getX, ...)
│   │   │   ├── index.ts        #     Composition root + Middy middleware chain
│   │   │   ├── ApiGatewayAdaptor.ts  # HTTP <-> domain mapping & error->status
│   │   │   ├── <Op>Domain.ts   #     Business logic (interface-only deps)
│   │   │   ├── I<Op>Domain.ts  #     Domain port
│   │   │   ├── assets/schema.json     # JSON Schema for request validation
│   │   │   └── tests/          #     Jest tests
│   │   └── shared/             #   Entity model, Repository, Factory/Map, Errors
│   └── shared/                 # Cross-entity: dto/, interfaces/, middlewares/,
│                               #   valueObjects/, PublisherAdaptor, StorageAdaptor, tracker/
│
├── extra/                      # Background / scheduled / event-driven Lambdas
│   └── functions.yml + one folder per Lambda + shared/
│
├── sls-resources/              # Infrastructure as code (CloudFormation fragments)
│   ├── dynamodb.yml  cognito.yml  s3.yml  iam.yml
│   ├── mediapackage-vod.yml  mediatailor-vod.yml  distribution.yml
│   ├── secret-manager.yml  state-machine.yml  environment.yml
│
├── utils/                      # Dev/test helpers (.ts) + ops scripts (.py)
└── .github/workflows/          # CI/CD (Serverless deploy)
```

---

## 4. The Per-Route Architecture Pattern

Every operation folder (e.g. `routes/channel/addChannel/`) implements the same four-layer pattern. This is the single most important pattern to internalize.

### Layer 1 — `index.ts` (Composition Root + Middleware)

Instantiates **all concrete dependencies** (DynamoDB client, every repository, factories, S3 storage, EventBridge publisher, log tracker) and wires them together, then wraps the handler in a [Middy](https://middy.js.org/) middleware chain:

```typescript
export default middy<AddChannelEvent>()
  .use(captureLambdaHandler(tracer))        // X-Ray tracing
  .use(injectLambdaContext(logger, { logEvent: true }))  // structured logging
  .use(httpJsonBodyParser())                // parse JSON body
  .use(validator({ inputSchema }))          // JSON-Schema request validation
  .use(httpEventNormalizer())               // normalize query/path params
  .use(httpHeaderNormalizer())              // normalize header casing
  .use(cors({ exposeHeaders: 'Location' }))
  .use(errorHandler)                        // shared error middleware
  .handler(addChannelHandler);
```

The handler is referenced from `functions.yml` as `routes/<entity>/<op>/index.default`.

> **Note — removed FD guard:** handlers used to count `/proc/self/fd` and `throw new Error('Recycling environment to prevent EMFILE')` above a threshold. That guard was counterproductive: throwing does not recycle a Lambda execution environment, so once a warm container crossed the threshold every subsequent request on it threw again and returned 502 until the container was idle-reaped. The invocation counter also fired unconditionally, guaranteeing a 502 roughly once every 700 requests per container. The real FD pressure was fixed at the HTTP layer instead (shared clients, draining unread response bodies). Do not reintroduce it.

### Layer 2 — `ApiGatewayAdaptor.ts` (HTTP Boundary)

Implements `IInvoker<Event, Context, APIGatewayProxyResult>`. It is the **only** layer that knows about HTTP. It extracts the request, calls the domain, and translates domain errors to HTTP status codes:

```typescript
try {
  const channel = await this.domain.addNewChannel(body);
  return { statusCode: 201, body: '', headers: { Location: `/channels/${channel.id}` } };
} catch (e) {
  switch (true) {
    case e instanceof ChannelError.ChannelAlreadyExist:      return { statusCode: 409, ... };
    case e instanceof ChannelError.UnknownChannelDependency: return { statusCode: 422, ... };
    case e instanceof ThumbnailError.InvalidThumbnail:       return { statusCode: 400, ... };
    default:                                                 return { statusCode: 500, body: '' };
  }
}
```

### Layer 3 — `<Op>Domain.ts` (Business Logic)

Implements `I<Op>Domain` and depends **only on interfaces** (`I*Repository`, `IFactory`, `IPublisher`, `IStorageAdaptor`, `ILogTracker`) — never on the AWS SDK directly. This is what makes the domain unit-testable with mocks. Example responsibilities for `AddChannelDomain`: convert DTO→entity via the factory, check existence, store the thumbnail in S3, persist via the repository, publish a `CHANNEL_ADDED` event, and write an audit log entry.

### Layer 4 — `shared/<Entity>Repository.ts` (Persistence)

`extends BaseRepository` (from the powertools layer) and `implements I<Entity>Repository`. It owns the single-table key construction (PK/SK/GSI values) and translates between DynamoDB documents and domain entities using the entity's **Factory**.

### Supporting cast in `<entity>/shared/`

| File | Role |
|------|------|
| `<Entity>.ts` | The domain entity class (usually extends `Asset`) |
| `<Entity>Repository.ts` | DynamoDB persistence; extends `BaseRepository` |
| `<Entity>Factory.ts` / `<Entity>Map.ts` | DTO ↔ entity conversion; resolves cross-entity deps |
| `<Entity>Error.ts` | Namespaced custom errors matched by the adaptor |
| `I<Entity>Repository.ts` | The repository port |

---

## 5. Shared Ports & Interfaces

Located in `routes/shared/interfaces/`. These are the hexagonal-architecture ports that decouple the domain from infrastructure.

| Interface | Purpose | Key signatures |
|-----------|---------|----------------|
| `IFactory` | Bidirectional domain ↔ persistence/DTO conversion | `toDomain(): T`, `toPersistence(): U` |
| `IPublisher<T>` | Event publishing abstraction (EventBridge) | `publish(event: T): Promise<boolean>` |
| `IStorageAdaptor` | Base64 file storage & retrieval (S3) | `store(path, file, name?): Promise<string>`, `remove(path): Promise<boolean>` |
| `IInvoker<E,C,R>` | Lambda handler contract (implemented by adaptors) | `handler(event, context): Promise<R>` |
| `ICDNAdaptor` | CloudFront cache invalidation | `invalidateCache(paths: string[]): Promise<void>` |
| `IMapper` | Generic domain conversion | `toDomain()`, `toDto()` |
| `IBuilder<T>` | Complex object construction | `build(): T` |
| `Validator<T>` | Type-safe validation | `isValid(value: T): boolean` |
| `ValueObject<T>` | Immutable wrapped value | `value(): T`, `equals(other): boolean` |
| `Asset` | Abstract base for most entities | `id, extId, createdAt, updatedAt, enabled` |
| `BaseDocument` | DynamoDB persistence shape | `PK, SK, id, entityType, ...` |

Concrete adaptors implementing these live in `routes/shared/`: `PublisherAdaptor` (EventBridge), `StorageAdaptor` (S3), `CDNAdaptor` (CloudFront), and `tracker/LogTrackAdaptor` (audit logging via the `logHandler` Lambda).

---

## 6. Domain Model

Most entities extend the `Asset` base class (`id`, `extId`, `createdAt`, `updatedAt`, `enabled`) and are created via static factory methods. Value objects (`Thumbnail`, `MediaPackageId`, `CronTask`) wrap primitives for validation/immutability.

### Content classification & delivery
- **Category / Genre** — content taxonomy; both carry a `weight` for manual ordering (note the unusual `GET .../weight/{index}` reorder endpoints).
- **Provider** — a content provider/integration (config, content types, slugs for MediaTailor/HLS/AID).
- **Platform** — a distribution target (iOS, Android, Web, SmartTV, …).
- **Package** — a subscription offering (`type` INTERNAL/EXTERNAL, `revenueModel` FREE/PAID, price, `Platform[]`, thumbnail, weight).
- **Stream** — a concrete stream delivery config (type, format, DAI params).
- **Location** — hierarchical geo entity (COUNTRY/STATE/CITY/ZIPCODE/PACKAGE) used for geo-targeted package availability.

### EPG (live TV guide)
- **EPGTemplate** — a reusable program-schedule blueprint (`mapping`, `templateType`).
- **EPG** — an Electronic Program Guide: a template reference, `programs[]`, an ingestion schedule (cron), timezone, ingestion URL, thumbnail. Supports MRSS-based program ingestion, validation, and repair.

### Channel (the live hub entity)
- **Channel** (`ROOT_ENTITY = 'CHANNEL'`) — the central live-TV entity, with relationships to Provider, Platform[], Category[], Package[], Genre[], Location[], Stream[], Distributor[], Brand[], and an EPG, plus a `mediapackageId` value object. Implements `excludeRelations()` to selectively trim relationship arrays in responses.

### VOD subsystem (`routes/vod/`)
- **Movie / Series / Episode** (`implements IVod`) — rich VOD entities with ratings, IMDb/TMDb IDs, VAST IDs, availability/expiration windows, cast, multiple thumbnails, and the same relationship arrays as Channel. `Series` contains `Episode[]`; `Episode` carries season/number/duration and a `seriesId`. `shouldDeactivate()` encodes lifecycle rules (expired, missing thumbnail, no stream).
- **Ingestion** — tracks an ingestion run: `parentId`, `status` (MRSS ingestion status), `failures[]`, `saved[]`, and a `jobs` map of MediaConvert job statuses; exposes `isIngestionCompleted()` / `isIngestionFailed()`.

### Operational / external
- **Brand, Distributor** — external integrations fetched over HTTP (do **not** extend `Asset`); referenced by Channel/Movie/Series.
- **AutoIngestion** — config for a recurring MRSS ingestion job (provider, packages, platforms, feed URL, schedule).
- **GeoIpRule** — WAF geo-blocking rules (weight-ordered, enable/disable).
- **NPVR Recording** — network PVR recordings (HarvestJob-driven).
- **Log** — audit-trail entries (event, entity, entityId, user).
- **ApiKey** — surfaces the API Gateway key for clients.

---

## 7. Data Layer (DynamoDB Single-Table Design)

**Primary table `cms-{stage}`** — `PAY_PER_REQUEST` billing, composite key `PK` (HASH) / `SK` (RANGE), plus **5 GSIs**:

| Index | PK / SK | Typical use |
|-------|---------|-------------|
| GSI1 | `GSI1-PK` / `GSI1-SK` | List-by-type (e.g. all assets of a type, all EPGs) |
| GSI2 | `GSI2-PK` / `GSI2-SK` | Secondary list/sort (e.g. by creation date) |
| GSI3 | `GSI3-PK` / `GSI3-SK` | Additional relationship lookups |
| GSI4 | `GSI4-PK` / `GSI4-SK` | Additional relationship lookups |
| GSI5 | `GSI5-PK` / `GSI5-SK` *(numeric SK)* | Weight/ordering queries |

A second table, **`cms-log`**, stores audit/event data. See the **Access patterns** table in [`README.md`](../README.md) before adding queries.

**`BaseRepository`** (`layers/powertools/nodejs/Repository.ts`) is the shared abstract base providing generic operations: `getItem`, `putItem`, `updateItem`, `deleteDocument`, `query`, `scan`, `transactWriteItems`, `batchGetItem`, `batchWriteItem`, `batchDeleteDocuments`. It auto-chunks batches (25 for writes/transactions, 100 for gets) and configures the `DynamoDBDocument` client with `removeUndefinedValues`/`convertEmptyValues`. Subclasses only build keys — mind DynamoDB **reserved words** (called out at the top of the file).

---

## 8. The Media Pipeline

The VOD media supply chain is the most complex subsystem. End to end:

```
MRSS feed / direct upload
        │
        ▼
[ ingest Lambdas ]  (reelz/curiosity/sony/* in extra/, or POST /vod/ingest)
        │  StartExecution
        ▼
[ Step Functions: vodStateMachine ]
   TriggerVODIngestion → Map(per URL) → IngestPage → Choice(CheckError)
        │                                              ├─ FAILURE → retry IngestPage
        │                                              └─ DONE → Succeed
        ▼
[ MediaConvert ]  transcode → outputs to S3 (movies/ series/ episodes/)
        │  EventBridge: "MediaConvert Job State Change"
        ▼
[ handleIngestedVod ]  → trigger MediaPackage VOD asset creation
        │  EventBridge: "MediaPackage Input Notification"
        ▼
[ handleAssetCreationVod ]  → finalize asset, update DynamoDB
        ▼
[ MediaPackage VOD ]  packaging group vod-{stage}
   ├─ HLS (clear)            ├─ HLS_DRM  (SPEKE / Widevine,  SAMPLE_AES, SCTE35)
   └─ DASH (clear)           └─ DASH_DRM (SPEKE / PlayReady, SCTE35, 6s segments)
        ▼
[ MediaTailor ]  {stage}-vod playback config
   dynamic VAST ad insertion (SpringServe ADS) + live pre-roll config
        ▼
[ CloudFront ]  multi-origin distribution (+ WAF prod-DistributionACL)
   /out/v1/* → MediaPackage (cached)   /v1/* & /tm/* → MediaTailor (no cache)
   default   → S3 assets (thumbnails, NPVR)
        ▼
   HLS / DASH players
```

**SPEKE DRM:** HLS uses Widevine system ID `94ce86fb-…`; DASH uses PlayReady `edef8ba9-…`. The SPEKE key-server URL and role are injected via Serverless `params` per stage.

**CDN auth:** a Secrets Manager value (`MediaPackageCDNIdentifier-{stage}`) is sent as the `X-MediaPackage-CDNIdentifier` origin header so only CloudFront can pull from MediaPackage.

**Ad targeting:** brand-specific VAST tag IDs (Crackle, Popcorn, INSP, AXS TV, …) live in `environment.yml` and are passed to MediaTailor/SpringServe.

---

## 9. Feature Set & HTTP API Surface

All HTTP endpoints are **API-key protected** (`private: true`) except `GET /apiKey` (Cognito-authorized). Base path is the API Gateway stage. CRUD entities follow REST conventions; the unusual `GET .../{id}/weight/{index}` endpoints perform reordering.

### Core metadata CRUD

| Entity | Endpoints |
|--------|-----------|
| **Category** | `POST /categories`, `GET /categories`, `PATCH /categories/{id}`, `GET /categories/{id}/weight/{index}`, `DELETE /categories/{id}` |
| **Genre** | `POST /genres`, `GET /genres`, `PATCH /genres/{id}`, `GET /genres/{id}/weight/{index}`, `DELETE /genres/{id}` |
| **Provider** | `POST /providers`, `GET /providers`, `PATCH /providers/{id}`, `DELETE /providers/{id}` |
| **Platform** | `POST /platforms`, `GET /platforms`, `PATCH /platforms/{id}`, `DELETE /platforms/{id}` |
| **Package** | `POST /packages`, `GET /packages`, `PATCH /packages/{id}`, `GET /packages/{id}/weight/{index}`, `DELETE /packages/{id}` |
| **Location** | `POST /locations`, `GET /locations`, `PATCH /locations/{id}`, `DELETE /locations/{id}` |
| **EPG Template** | `POST /epgTemplates`, `GET /epgTemplates`, `PATCH /epgTemplates/{id}`, `DELETE /epgTemplates/{id}` |
| **API Key** | `GET /apiKey` *(Cognito-auth)* |

### Channel

`POST /channels` · `GET /channels/{id}` · `GET /channels` *(filters: active, categories, packages, platforms, providers, search, sort, limit, nextToken)* · `PATCH /channels/{id}` · `DELETE /channels/{id}`

### EPG (live guide)

`POST /epg` · `GET /epg` · `GET /epg/{id}` · `PATCH /epg/{id}` · `DELETE /epg/{id}` · `POST /epg/{id}/program` · `PATCH /epg/{id}/program/{programId}` · `DELETE /epg/{id}/program` *(all programs)* · `GET /epg/{id}/validate` · `GET /epg/{id}/ingest` · `POST /epg/{id}/repair`
Plus scheduled internals: `scheduleHandler`, `validateAllEPGs`.

### VOD

| Sub-entity | Endpoints |
|------------|-----------|
| **Movie** | `POST /vod/movies`, `GET /vod/movies/{id}`, `GET /vod/movies` *(same filters as channels)*, `PATCH /vod/movies/{id}`, `DELETE /vod/movies/{id}` |
| **Series** | `POST /vod/series`, `GET /vod/series/{id}`, `GET /vod/series`, `PATCH /vod/series/{id}`, `DELETE /vod/series/{id}`, `GET /vod/series/{id}/episodes`, `GET /vod/series/{id}/episodes/{episodeId}` |
| **Episode** | `POST /vod/episodes`, `PATCH /vod/episodes/{id}`, `DELETE /vod/episodes/{id}` |
| **Ingestion** | `GET /vod/ingestions`, `GET /vod/ingestions/{id}` |
| **Ingest trigger** | `POST /vod/ingest` (starts the Step Functions state machine) |

### Auto-Ingestion, Geo-IP, NPVR, Logs, Monitor

| Entity | Endpoints |
|--------|-----------|
| **AutoIngestion** | `POST /autoingestions`, `GET /autoingestions`, `GET /autoingestions/{id}`, `PATCH /autoingestions/{id}`, `DELETE /autoingestions/{id}` |
| **Geo-IP** | `POST /rules`, `GET /rules` *(limit, nextToken)*, `PATCH /rules/{id}` *(enable)*, `GET /rules/{id}/weight/{index}`, `DELETE /rules/{id}` |
| **NPVR** | `POST /npvr` *(schedule)*, `GET /npvr/{username}/recordings`, `GET /npvr/{username}/recordings/{id}`, `POST /npvr/{username}/recordings` *(bulk delete)*, `DELETE /npvr/recordings/{id}` |
| **Log** | `POST /logs`, `GET /logs` *(limit, nextToken)* |
| **Monitor** | `GET /monitor/logs`, `GET /monitor/{channel}/logs` |

---

## 10. Event-Driven & Scheduled Functions

These run without HTTP triggers. HTTP-route internals are defined in `routes/*/functions.yml`; standalone background workers live in `extra/functions.yml`.

### Event/schedule-driven route functions
| Function | Trigger | Purpose |
|----------|---------|---------|
| `epg/scheduleHandler` | AWS Scheduler | Runs scheduled EPG ingestion |
| `epg/validateAllEPGs` | Scheduler | Bulk EPG validation |
| `geoip/eventListener` | EventBridge (`cms.api`) | Syncs geo-IP rules to WAF |
| `npvr/recordingHandler` | EventBridge (MediaPackage HarvestJob) | Finalizes an NPVR recording |
| `vod/ingestVod` | Step Functions task | Per-URL VOD ingestion worker |
| `vod/handleIngestedVod` | EventBridge (MediaConvert Job State Change) | Advances asset to MediaPackage |
| `vod/handleAssetCreationVod` | EventBridge (MediaPackage Input Notification) | Finalizes asset creation |
| `vod/MediaTailorCustomResource` | CloudFormation custom resource | Wires MediaTailor ↔ CloudFront on deploy |

### Background workers (`extra/`)
| Lambda | Trigger | What it does |
|--------|---------|--------------|
| `reelzMrssIngest` | cron daily | Reads Reelz MRSS, starts `vodStateMachine` with a Reelz field-mapping template |
| `curiosityMrssIngest` | cron weekly (Sun) | Same for Curiosity Stream feed |
| `sonyMrssIngest` | cron monthly (28th) | Pulls Sony XML from S3, transforms, starts ingestion |
| `generateEpgAdSchedules` | cron daily | Reads MediaTailor channel schedules, builds EPG ad-schedule JSON/XML, uploads to CDN |
| `girlyFlixAdSchedule` / `manAdSchedule` | cron hourly | Per-channel ad cue-point schedules (via `extra/shared/adSchedule.ts`) |
| `epgAnalyticsAutoFix` | Scheduler (every 1–2h) | Invokes EPG validation; if errors/gaps exceed thresholds, publishes to an SNS topic |
| `npvrAutomaticRemover` | Scheduler daily 09:00 UTC | Deletes NPVR recordings + S3 objects older than `EXPIRY_MONTHS` (default 3) |
| `cdn4xx5xxAlerts` | SNS (CloudWatch alarm) | Formats/forwards CDN 4xx/5xx alarm notifications |
| `mediaConnectStatusPush` | EventBridge (MediaConnect source health) | Debounces CONNECTED↔DISCONNECTED transitions, updates MediaLive schedule & notifies via SNS |

---

## 11. Infrastructure (AWS Resources)

Defined under `sls-resources/` and assembled in `serverless.yml`.

**Runtime config:** Node.js 22.x, `us-east-1`, 1024 MB / 30 s defaults, 3-day log retention, X-Ray tracing on API Gateway + Lambda. Plugins: `serverless-esbuild`, `serverless-prune-plugin` (keep 3), `serverless-step-functions`, `serverless-plugin-split-stacks` (per-type). esbuild marks the AWS SDK clients and several libs as **external** (provided by the powertools layer, not bundled).

| Resource file | Provisions |
|---------------|-----------|
| `dynamodb.yml` | `cms-{stage}` table + GSI1–5, PAY_PER_REQUEST |
| `cognito.yml` | User pool `cms-{stage}` (email login, admin-create-only) + app client `cms-web-client-{stage}` (`ADMIN_NO_SRP_AUTH`) |
| `s3.yml` | `cmsAssetsBucket` (thumbnails, NPVR; locked to CloudFront OAC); references external `sony-freecast` |
| `iam.yml` | Default Lambda role (DynamoDB, S3, Media* services, WAF, Scheduler, Step Functions, CloudFront invalidation, SNS) + dedicated scheduler/MediaConvert roles |
| `mediapackage-vod.yml` | Packaging group `vod-{stage}` + 4 packaging configs (HLS/DASH × clear/DRM) with SPEKE |
| `mediatailor-vod.yml` | `{stage}-vod` playback config + live pre-roll; SpringServe ADS |
| `distribution.yml` | CloudFront multi-origin distribution (MediaPackage, S3, MediaTailor ads/CDN) behind WAF |
| `secret-manager.yml` | `MediaPackageCDNIdentifier-{stage}` (30-char CDN auth token) |
| `state-machine.yml` | `vodStateMachine` Step Functions definition |
| `environment.yml` | All Lambda env vars: table names, ARNs, MediaConvert/MediaPackage/MediaTailor config, CDN domains, VAST/ad tag IDs |

---

## 12. Security & Auth

- **API keys** — every CRUD endpoint is `private: true`; clients send an API Gateway API key (`${stage}-cms`). `GET /apiKey` surfaces it (this route uses Cognito instead).
- **Cognito** — user pool `cms-{stage}` with email login, admin-only user creation, and `ADMIN_NO_SRP_AUTH`. Used to authenticate CMS web-client users.
- **WAF** — the CloudFront distribution sits behind `prod-DistributionACL`. Geo-IP rules managed through `/rules` endpoints feed WAF geo-blocking.
- **IAM** — least-privilege-ish per-function roles; secrets (SPEKE/CDN) in Secrets Manager; origin lockdown via the `X-MediaPackage-CDNIdentifier` header + S3 Origin Access Control.

---

## 13. Observability

Every handler wires **AWS Lambda Powertools**:
- `Logger` with `serviceName: 'FreeCast-API-<operation>'` and structured JSON logs (`injectLambdaContext`, `logEvent: true`).
- `Tracer` with `captureLambdaHandler` for **X-Ray** distributed tracing.
- CloudWatch metrics (errors, duration p95/p99, throttles) are emitted automatically; alarms feed SNS → `cdn4xx5xxAlerts` and the EPG/MediaConnect notifiers.

When adding a handler, preserve this middleware ordering and the `serviceName` convention.

---

## 14. Getting Started

### Prerequisites
- **Node.js ≥ 16** (runtime targets 22.x; 16+ works for local dev) and **npm ≥ 8**
- **Docker** (for DynamoDB Local)
- **Serverless Framework** globally: `npm install -g serverless`
- AWS credentials configured for deploys

### Install
```sh
git clone git@github.com:FreeCastInc/FC_MC_cms_api.git
cd FC_MC_cms_api
npm install      # preinstall hook recursively installs deps in layers/ and routes/
```
> The root `preinstall` runs `utils/install-dependencies.js`, which walks `layers/` and `routes/` and runs `npm i` in every nested `package.json` (the powertools layer + per-route packages). A plain `npm install` does all of this.

### Run the tests
```sh
docker-compose up        # start DynamoDB Local on :8000 (required)
npm test                 # jest --coverage → report.json
npm run test-watch       # watch mode
```
Run a single test:
```sh
npx jest routes/channel/addChannel/tests/apigateway-adaptor.test.ts
npx jest -t "partial test name"
```
> The npm scripts set `POWERTOOLS_DEV=true` using bash `export`. On Windows PowerShell, set `$env:POWERTOOLS_DEV='true'` before invoking jest manually.

### Local DynamoDB table helpers
```sh
ts-node utils/create-table.ts [table-name]   # defaults to fc-local-test
ts-node utils/drop-table.ts   [table-name]
```

### Lint
```sh
npx eslint 'routes/**/*.ts'   # airbnb-base + typescript; strict import ordering
```

### Adding a new endpoint (checklist)
1. Create `routes/<entity>/<operation>/` with `index.ts`, `ApiGatewayAdaptor.ts`, `<Op>Domain.ts`, `I<Op>Domain.ts`, and `assets/schema.json`.
2. Reuse/extend the entity's `shared/` Repository, Factory, and Errors.
3. Add the function block to `routes/<entity>/functions.yml`.
4. Ensure that `functions.yml` is imported in `serverless.yml`'s `functions:` list (new entities only).
5. Add `tests/` and run them against DynamoDB Local.

---

## 15. Deployment & CI/CD

### Manual
```sh
sls deploy --stage <dev|test|qa|prod>
sls remove --stage <env>
```

### GitHub Actions (`.github/workflows/`)
| Trigger | Stage deployed |
|---------|----------------|
| **PR → `develop`** (`serverless-dev.yml`) | `test` |
| **push → `develop`** (`serverless.yml`) | `qa` |
| **push → `production`** | `prod` |

> Branch names and AWS stage names intentionally differ — `develop` deploys to **qa**, `production` to **prod**. The shared `deploy-serverless.yml` reusable workflow needs `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `SERVERLESS_ACCESS_KEY` secrets. The `develop` branch is protected and expects a `coverage` status check; changes normally go through a PR.

### MRSS ingestion caveat
When testing MRSS ingestion: validate XPath with `utils/xpath-tester.ts` first, test on `dev`, and **comment out the `this.mediaTranscoder.transcode(...)` calls** beforehand so no MediaConvert jobs fire (see README).

---

## 16. Developer Utilities

`utils/` mixes TypeScript dev/test helpers with Python operational scripts.

**TypeScript (dev/test):**
- `install-dependencies.js` — recursive sub-package installer (run by `preinstall`).
- `create-table.ts` / `drop-table.ts` — manage local DynamoDB tables.
- `database-table-utils.ts` / `database-log-table-utils.ts` — table schema definitions used by tests and setup.
- `export-table-data.ts` / `import-table-data.ts` — dump/restore table data.
- `jest-utils.ts` — shared test setup helpers.
- `xpath-tester.ts` — validate MRSS XPath mappings before ingestion.
- `toISOString.ts` — date helper.

**Python (operational / one-off ops, run manually against AWS):**
- `parse-mrss.py`, `check-epg.py` — feed/EPG inspection.
- `clean-s3.py`, `clean-movie.py`, `clear-table.py`, `delete_duplicates.py`, `delete_popcorn.py` — cleanup tasks.
- `check_items_thumbnail.py`, `enable_series.py`, `ingestion_state.py` — data fixes/inspection.
- `list_mediaconvert_jobs.py`, `start_mediaconvert_jobs.py`, `stop_mc_jobs.py`, `start_mp.py`, `mp_assets.py` — MediaConvert/MediaPackage job operations.

---

## 17. Conventions & Gotchas

- **The `/opt/nodejs/powertools/*` import path** is the AWS Lambda Layer mount path. At runtime Lambda mounts the layer at `/opt`; locally it is remapped via `paths` in `tsconfig.json` and `moduleNameMapper` in `jest.config.ts`. Such imports are *not* broken — they're remapped.
- **Functions are not inline** in `serverless.yml`; each route contributes a `functions.yml`. Adding an entity means creating that file *and* adding the import line.
- **TypeScript strict** is on, but `useUnknownInCatchVariables` is disabled, so `catch (e)` is `any`.
- **ESLint import ordering** is enforced (builtin → external → internal → parent → sibling → index → object → type, newlines between groups, alphabetized). Prefix intentionally-unused vars with `_`.
- **Error handling pattern**: throw namespaced domain errors (e.g. `ChannelError.ChannelAlreadyExist`) from the Domain; translate to HTTP status codes in the `ApiGatewayAdaptor` via `switch (true)`.
- **DynamoDB reserved words** — guard against them when building expressions in repositories (see the header comment in `Repository.ts`).
- **Single-table design** — never assume one entity per table; consult the README access-pattern table and the existing repository before adding a query or GSI usage.
- **Do not add an FD-counting guard** that throws to "recycle" the container. A thrown error leaves the warm container in the pool, so the condition stays true and the container returns 502 for every subsequent request. Fix file-descriptor leaks at their source (reuse SDK clients across invocations, always drain or destroy HTTP response bodies).
