# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FreeCast CMS REST API — a fully serverless API Gateway + AWS Lambda backend (TypeScript, Node.js 22.x) deployed with the Serverless Framework. It manages streaming media entities (channels, EPGs, VOD movies/series/episodes, packages, platforms, providers, etc.) backed by a single DynamoDB table with single-table-design access patterns. Media workflows integrate AWS MediaPackage, MediaConvert, MediaTailor, MediaLive, CloudFront, and Step Functions.

## Commands

```sh
# Install — preinstall hook recursively runs `npm i` in every nested package.json
# (see utils/install-dependencies.js) across layers/ and routes/. Plain `npm install` triggers it.
npm install

# Tests require DynamoDB Local running first (port 8000)
docker-compose up          # start local DynamoDB
npm test                   # jest --coverage, outputs report.json
npm run test-watch         # watch mode

# Run a single test file / single test
npx jest routes/channel/addChannel/tests/apigateway-adaptor.test.ts
npx jest -t "partial test name"

# Lint (ESLint flat-ish config in .eslintrc.cjs, airbnb-base + typescript)
npx eslint 'routes/**/*.ts'

# Deploy (3 environments: dev, test, prod; also qa). Requires `npm i -g serverless`.
sls deploy --stage <env>
sls remove --stage <env>

# Local DynamoDB table helpers (table defaults to `fc-local-test`)
ts-node utils/create-table.ts [table-name]
ts-node utils/drop-table.ts [table-name]
```

Tests set `POWERTOOLS_DEV=true`. On Windows use `$env:POWERTOOLS_DEV='true'` before invoking jest manually (the npm scripts use `export`, which is bash syntax).

## Architecture

### Serverless composition (serverless.yml)
- `service: cms-api`. Functions are NOT defined inline — each route directory contributes a `functions.yml` that `serverless.yml` imports via `${file(...)}`. Adding an endpoint means editing/creating that route's `functions.yml` **and** adding the import line to `serverless.yml`'s `functions:` list.
- Infrastructure (DynamoDB, Cognito, S3, IAM, MediaPackage/MediaTailor, CloudFront, Secrets) lives in `sls-resources/*.yml`, imported under `resources:`. Environment variables for all functions come from `sls-resources/environment.yml`.
- `package: individually: true` + `serverless-esbuild` bundles each Lambda separately. AWS SDK clients and several libs are marked `external` in the esbuild config because they are provided by the **powertools Lambda Layer**, not bundled.
- VOD ingestion runs as a Step Functions state machine (`sls-resources/state-machine.yml`), fanning out per-URL via a Map state.

### Lambda Layers and the `/opt/nodejs/powertools/` import path
- `layers/powertools/nodejs/` is an AWS Lambda Layer containing shared runtime deps (AWS Lambda Powertools — Logger/Tracer/Metrics, Middy middleware, AWS SDK DynamoDB clients) **plus** shared code: `Repository.ts` (the `BaseRepository` abstract class) and `UIDGenerator.ts`.
- Code imports these as `import ... from '/opt/nodejs/powertools/Repository'` — the runtime path where Lambda mounts the layer. Locally this resolves via `paths` in `tsconfig.json` and `moduleNameMapper` in `jest.config.ts`. If an `/opt/...` import appears unresolvable, it is being remapped, not broken.
- The layer has its own `package.json`; `utils/install-dependencies.js` installs it during the root `npm install`.

### Per-route hexagonal/clean architecture
Every route lives under `routes/<entity>/` and is split into one folder per operation (`addChannel`, `getChannels`, `deleteChannel`, ...) plus a `shared/` folder. Each operation folder follows the same layered pattern:

- **`index.ts`** — composition root. Instantiates all concrete dependencies (DynamoDB client, repositories, factories, storage, publishers, trackers) and wraps the handler in a Middy middleware chain: `captureLambdaHandler(tracer)` → `injectLambdaContext(logger)` → `httpJsonBodyParser` → `validator({ inputSchema })` → event/header normalizers → `cors` → `errorHandler`. Exported as `default` and referenced in `functions.yml` as `index.default`.
- **`ApiGatewayAdaptor.ts`** — implements `IInvoker`; maps the HTTP event to a domain call and translates domain errors into HTTP status codes via a `switch (true) { case e instanceof SomeError: ... }` block. This is the only layer that knows about HTTP.
- **`<Op>Domain.ts`** — business logic. Depends only on interfaces (`I*Domain`, `I*Repository`, `IFactory`, `IPublisher`, `IStorageAdaptor`, `ILogTracker`), never on AWS SDK directly.
- **`assets/schema.json`** — JSON Schema used by the `@middy/validator` for request validation.
- **`tests/`** — Jest tests, typically `apigateway-adaptor.test.ts`, using `aws-sdk-client-mock` and DynamoDB Local.

The `routes/<entity>/shared/` folder holds the domain model and persistence for that entity:
- **Entity class** (`Channel.ts`) — the domain object.
- **`<Entity>Repository.ts`** — `extends BaseRepository` (from the powertools layer) and `implements I<Entity>Repository`. Encapsulates the DynamoDB single-table PK/SK/GSI key construction.
- **`<Entity>Factory.ts` / `<Entity>Map.ts`** — convert between DTOs (request/response shapes) and domain entities; factories also resolve cross-entity dependencies.
- **`<Entity>Error.ts`** — namespaced custom error classes matched in adaptors.

`routes/shared/` holds cross-entity primitives: DTOs (`dto/`), port interfaces (`interfaces/`), Middy middlewares (`middlewares/errorHandler`), value objects (`valueObjects/`), the EventBridge `PublisherAdaptor`, S3 `StorageAdaptor`, and the `tracker/` (audit logging via the `logHandler` Lambda).

### Data layer (single-table design)
- One DynamoDB table `cms-${stage}` (env `CMS_TABLE_NAME`) plus a `cms-log` table (`CMS_LOG_TABLE_NAME`). Access patterns and GSI key designs are documented in `README.md` ("Access patterns" table) — consult it before adding queries.
- `BaseRepository` (powertools layer) provides generic `getItem/putItem/updateItem/query/scan/transactWriteItems/batchGetItem/batchWriteItem/batchDeleteDocuments`, auto-chunking batches (25 for writes/transactions, 100 for gets) and configuring `DynamoDBDocument` with `removeUndefinedValues`. Subclasses build the keys; mind DynamoDB reserved words (noted at the top of `Repository.ts`).

### Background / scheduled Lambdas (`extra/`)
Non-CRUD functions defined in `extra/functions.yml`: scheduled MRSS ingestions (Reelz, Curiosity, Sony), EPG ad-schedule generators (cron), NPVR auto-remover, CDN 4xx/5xx alerting, MediaConnect status push (EventBridge), and EPG analytics auto-fix. These follow the same `index.default` handler convention but are triggered by `schedule`, `sns`, or `eventBridge` events rather than HTTP.

## Conventions
- **TypeScript strict mode** is on (`tsconfig.json`); `useUnknownInCatchVariables` is disabled so `catch (e)` is `any`.
- **ESLint**: airbnb-base + airbnb-typescript. Imports must be ordered (builtin → external → internal → parent → sibling → index → object → type) with newlines between groups, alphabetized. Unused vars are errors unless prefixed `_`. `no-console` is off.
- **Error handling**: define domain-specific error classes (often grouped under a namespace, e.g. `ChannelError.ChannelAlreadyExist`); throw them from the Domain, translate them to HTTP codes in the `ApiGatewayAdaptor`.
- **Observability**: every handler wires a Powertools `Logger`/`Tracer` with `serviceName: 'FreeCast-API-<operation>'` and X-Ray tracing through Middy. Preserve this pattern when adding handlers.

## Testing notes
- Tests are pure Jest (`ts-jest`), `testTimeout: 90000`. They exercise repositories against **DynamoDB Local** (must be running), and mock AWS service clients (S3, EventBridge, MediaPackage, Lambda, etc.) with `aws-sdk-client-mock`.
- Table setup/teardown helpers: `utils/database-table-utils.ts`, `utils/jest-utils.ts`.

## MRSS ingestion caveat (from README)
When testing MRSS ingestion, validate XPath with `utils/xpath-tester.ts` first, test on `dev`, and comment out the `this.mediaTranscoder.transcode(...)` calls beforehand so no MediaConvert jobs are triggered.
