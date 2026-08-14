# Prompt log

Every prompt that shaped this repository, what it produced, and what had to be changed
afterwards. Required by `CLAUDE.md`; also the prompt-engineering documentation the
challenge brief asks for.

---

## Block 1 — Workspace foundation and CI

**Prompt**

> impliment this plane 1 by 1 block complete 1 block the stop untill i ask for block 2
> `/production-quality` `/implement-from-spec`

Executed against [`plan.md`](./plan.md) Block 1, with two skills loaded: one demanding
reusable, DRY, single-responsibility code with no dead placeholders; the other demanding
that every plan item be built and verified rather than reported as partial.

**Produced**

- `packages/tsconfig/{package.json,base.json}` — `@dukkanify/tsconfig`, a workspace
  holding correctness flags only (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
  `module`, `target` and `jsx` stay in the apps, which are the only things that know
  their own runtime.
- Both app `tsconfig.json` files rewritten to extend it, dropping the flags the base now
  owns. `apps/api` had been running on partial strictness (`strictNullChecks` +
  `noImplicitAny` + `strictBindCallApply`); it is now fully strict.
- `.github/workflows/ci.yml` — one `verify` job: install, the §3 dependency-rule guard,
  a logical-CSS guard, typecheck, lint, test, build.
- `apps/api/src/main.ts` — `void bootstrap()` clears the floating-promise warning; an
  explicit `Promise<void>` return type replaces the inferred one.

**Trade-offs and deviations**

1. **A shadcn file was hand-edited**, which `CLAUDE.md` and `architecture.md` §5 both
   forbid. `components/ui/sonner.tsx` cast `theme` to `ToasterProps["theme"]`, a type
   that includes `undefined`; under `exactOptionalPropertyTypes` that is an error. Fixed
   by casting to `NonNullable<ToasterProps["theme"]>` — one token, and strictly more
   accurate, since `useTheme()` is destructured with a `"system"` default and therefore
   cannot yield `undefined`. The alternative was disabling the flag for the whole web
   app, which would have cost type safety exactly where React props flow.
2. **`prisma.config.ts` was restructured**, not just reformatted. Prisma generated
   `datasource: { url: process.env['DATABASE_URL'] }`, which `exactOptionalPropertyTypes`
   rejects for passing a possible `undefined` to an optional property. The datasource is
   now spread in only when the variable is set, so `prisma generate` still runs in CI
   with no database, and commands that genuinely need a connection fail with Prisma's own
   named-variable error instead of a confusing `undefined`.
3. **CI does not call the root `npm run build`.** That script builds
   `@dukkanify/contracts` first, and the package does not exist until Block 2, so CI
   builds the two apps directly and switches to the root script once contracts lands.
4. **Two CI guards are greps, not a script.** `CLAUDE.md` forbids adding files that were
   not asked for, so the dependency-rule and logical-CSS checks live inline in the
   workflow. A `scripts/check-architecture.sh` would let the same checks run locally
   before every commit; proposed, not built.
5. **A logical-CSS guard was added** beyond the block's list, because the plan makes it a
   standing gate for every block and it is far cheaper to enforce from commit one than to
   retrofit across a built frontend.

**Verified** typecheck, lint, test, both app builds green; the CI YAML parses and both
guards were negative-tested (they fail on a planted violation and pass on the real tree);
`dukkanify-db` reports `healthy`.

**Left open** The host machine runs its own PostgreSQL on `127.0.0.1:5432`, so the
container's published port never takes effect and `DATABASE_URL` currently resolves to
the wrong server. Blocks Block 3, not Block 1. Needs either the host service stopped or
the container moved to `5433`.

---

## Block 2 — `packages/contracts`

**Prompt**

> start block 2
> `/production-quality` `/implement-from-spec`

**Produced** `@dukkanify/contracts`, ten source files, 19 vitest cases, consumed by both
apps. `primitives.ts` holds the leaf rules (slug, sku, hex colour, CSS length, money
string, internal href, currency, locale) so "what a slug is" exists once;
`enums.ts` mirrors the Prisma enums; `theme.schema.ts` adds `themeToCssVariables` as the
single token→custom-property mapping; `section.schema.ts` is the five-variant
discriminated union; `blueprint.schema.ts` is the model's output contract;
`dto.ts` is the wire shape; `json-schema.ts` is the tool schema.

**Trade-offs and deviations**

1. **The blueprint deliberately omits everything code can derive.** No store slug (only
   the database can decide global uniqueness), no `direction` (follows locale via
   `directionForLocale`), no `position` fields (arrays are ordered; index is position), no
   per-product currency (one store, one currency), no image URLs (deterministic
   placeholders, never a hallucinated link). This shrinks the contract the model has to
   satisfy and moves those guarantees into Block 8's normalisation, where they are certain.
2. **Fonts are an enum, not free text.** `next/font` needs family names at build time, so
   a family the model invents cannot load. This pre-commits Block 10 to IBM Plex Sans
   Arabic, Noto Kufi Arabic and Source Serif 4.
3. **`ctaHref` is restricted to same-site paths and anchors.** Not in the plan; added
   because a generated `https://…` or `javascript:` href would otherwise be rendered into
   an anchor tag. Refusing it at the contract is cheaper than sanitising at every renderer.
4. **`zod-to-json-schema` is pinned to exactly 3.24.6.** From 3.25 it types itself against
   `zod/v3` while this package imports zod's root entry; the two declare identical types in
   different files, and relating them exceeds TypeScript's recursion limit — TS2589 even on
   a one-field schema. Several type-level workarounds (widening to `ZodTypeAny`, annotating
   the options object, narrowing the function signature) each moved the error rather than
   fixing it. Version alignment is the actual fix. It installs nested, because `shadcn`
   pulls 3.25.2 transitively; a build-time CLI's copy is not worth forcing down.
5. **The tool schema is generated from `StoreBlueprintStructureSchema`, not the refined
   schema**, and the result is _validated_ at module load rather than cast. JSON Schema
   cannot express cross-field rules, so those stay validation-time concerns for the repair
   turn; and a generated schema from a third-party library is an external input, so it gets
   the same treatment as any other — a wrong tool schema does not throw, it silently
   degrades generation.
6. **`primitives.ts` is an extra file** beyond the block's list, to keep leaf rules DRY.
7. **CI gained a `Build contracts` step before typecheck.** From Block 3 the apps resolve
   `@dukkanify/contracts` through its `dist`, which does not exist in a fresh clone. Fixing
   the ordering now avoids a CI break later; the final `Build` step is now the root script.

**Verified** contracts typecheck, build and 19 tests green; root `npm run typecheck`,
`lint`, `test` and `build` all green; `@dukkanify/contracts` proven to resolve under both
apps' own tsconfigs (temporary probe files, since `api` uses `nodenext` resolution, which is
the strict case) and the probes removed.

**Left open** `docs/prompts.md` is now gitignored, so the challenge's mandatory
prompt-engineering documentation must be carried by the README in Block 15. The PostgreSQL
port collision from Block 1 is still the blocker for Block 3.

---

## Block 3 — Prisma schema, migration, Prisma 7 spec alignment

**Prompt**

> block 3
> `/production-quality` `/implement-from-spec`

**Produced** The §6 data model in PostgreSQL — 7 tables, 4 enums, `numeric(10,2)` prices,
every index and `onDelete` rule — plus the initial migration, `PrismaModule` /
`PrismaService`, and the §6 rewrite for Prisma 7.

**Trade-offs and deviations**

1. **`@prisma/adapter-pg` was added, and it was not optional.** Prisma 7 ships no bundled
   query engine: `new PrismaClient()` reports "a driver adapter is required", and the
   `datasourceUrl` constructor option no longer exists. Both were verified by probe before
   installing anything. The version matches `prisma` exactly (7.9.1) and it bundles `pg`,
   so it is one dependency, not two. Without it Block 3 could not produce a module that
   connects at all.
2. **PostgreSQL moved to host port 5433** (`docker-compose.yml`, `.env`, `.env.example`).
   The host runs its own PostgreSQL on 5432, so the container's mapping never bound and
   `DATABASE_URL` resolved to the wrong server. Chosen over stopping the host service
   because it needs no privileges and touches nothing else on the machine.
3. **Two fields were written and then removed to match §6 exactly.** `Store.currency` turned
   out unnecessary (contracts exposes currency per product, not per store) and
   `Product.position` has a deterministic alternative. Consequence: §6 gives `Product` no
   ordering column, so Block 7 must sort products explicitly — the model's intended order
   from the blueprint array is not preserved.
4. **`PrismaService` has no `@Injectable()` decorator.** It takes a connection string, so it
   must come from the module's factory; leaving the decorator off turns an accidental direct
   injection into a startup wiring error instead of a confusing runtime failure. The factory
   is also the single seam Block 4 re-points at typed configuration.
5. **`process.env` is read in exactly one file** (`prisma.module.ts`), as §12 requires, and
   it throws a named error when `DATABASE_URL` is missing. Block 4 moves that read into the
   config module.
6. **`PrismaModule` is deliberately not imported into `AppModule`.** Bootstrapping and `.env`
   loading belong to Block 4's `ConfigModule`; wiring it now would mean loading dotenv from
   `main.ts` and then undoing it.
7. **ESLint now ignores `apps/api/src/generated`.** Prisma 7 emits TypeScript _source_ into
   the source tree, so `lint --fix` would rewrite a file the next `prisma generate` replaces.
   `tsc` still type-checks it — and it passes every strict flag, including
   `exactOptionalPropertyTypes`.
8. **Scripts added to `apps/api`:** `postinstall: prisma generate` (requested), plus
   `db:migrate` and `db:deploy` — the root `db:migrate` script already delegated to a script
   that did not exist.

**Verified** Migration applies clean; 7 tables, 4 enums in declared order, `numeric(10,2)`,
all 18 indexes and unique constraints present. An integration probe through Nest DI
confirmed the module connects, that `Decimal` round-trips exactly (`1234.56`, a Decimal
instance rather than a float), and that deleting an owner cascades to their products.
`prisma generate` was confirmed to succeed with `DATABASE_URL` unset, which is the CI case.
Root typecheck, lint, test and build all green.

**Left open, both flagged rather than fixed**

- `apps/api` sets `@typescript-eslint/no-explicit-any: 'off'`, which contradicts CLAUDE.md's
  ban on `any`. Flipping it to `error` would enforce a stated non-negotiable.
- `start:prod` runs `node dist/main`, but the compiled entry point is `dist/src/main.js`:
  `prisma.config.ts` sits at the package root, which shifts the inferred `rootDir` up one
  level. Pre-existing. One-line fix in `tsconfig.build.json` — `"rootDir": "src"` plus
  excluding `prisma.config.ts` — and it belongs to Block 4, which owns bootstrapping.
- The AI provider question below.

---

## Block 4 — API skeleton: config, errors, filter, interceptors, health

**Prompt**

> block 4

**Produced** Zod-validated configuration, the §10 error model and its single mapping to
HTTP, the `{ data, meta }` envelope, request logging, `@Public()` / `@CurrentUser()`, a
hardened `main.ts`, and `GET /api/v1/health`.

**Trade-offs and deviations**

1. **`AI_PROVIDER` accepts `mock | claude | gemini`.** `.env` is configured for Gemini while
   every document specifies Anthropic, and Block 4 could not validate an environment without
   choosing. Supporting all three in the enum costs two lines, keeps both files valid, and
   defers the real decision to Block 8, which builds the adapter. A `superRefine` requires
   the matching key only for the selected provider, and `DEFAULT_AI_MODEL` is per provider so
   neither inherits the other's model name.
2. **`@nestjs/config` is no longer used.** The gate requires configuration failure to print a
   list "not a stack trace", and Nest's exception handler wraps any error thrown during
   `NestFactory.create` in an injector stack — including with `abortOnError: false`, which was
   tried first. Validating before the container starts is the only way, which means `.env`
   must already be loaded, which means `import 'dotenv/config'` in `main.ts`. `ConfigModule`
   then had nothing left to do. `@nestjs/config` is now an unused dependency.
3. **`validateEnv` is called twice** — once in `main.ts` for the readable failure, once in the
   `AppConfig` provider. It is a pure function over `process.env`, and the alternative was a
   chain of dynamic modules threading a pre-parsed object through `AppModule.forRoot`.
4. **Global filter, interceptors and throttler guard are registered as `APP_*` providers**
   rather than in `main.ts` as the plan said, because `AllExceptionsFilter` injects
   `AppConfig` to decide about stack traces and `useGlobalFilters` bypasses DI.
5. **`apps/api` moved from jest to vitest, earlier than Block 9.** ts-jest cannot parse the
   Prisma 7 client, which is TypeScript _source_ in the source tree and reachable from any
   class that touches the database through decorator metadata. Vitest ran it with no
   configuration at all. `jest`, `ts-jest` and `@types/jest` are now unused dependencies, and
   `test:cov` was dropped rather than left pointing at a runner that is gone.
6. **`moduleFormat = "cjs"` added to the Prisma generator.** The generator defaults to ESM and
   emits `import.meta.url`; `tsc` cannot downlevel it, so the build succeeded and `node
dist/main` died with "exports is not defined in ES module scope". Documented in §6 as
   load-bearing, because nothing in the schema hints at it.
7. **`HealthController` depends on `Pick<PrismaService, 'checkConnection'>`**, injected by the
   `PrismaService` token. The first draft of its test used `as unknown as PrismaService` —
   which CLAUDE.md bans — and narrowing the dependency removed the need for a cast entirely.
8. **The health endpoint always answers 200.** It reports liveness and describes reachability;
   the readiness variant that 503s so an orchestrator stops routing needs a deployment target
   to design against.
9. **Scaffold removals:** `app.controller.ts`, `app.service.ts` and their specs (Hello World),
   plus `test/app.e2e-spec.ts` and `test/jest-e2e.json`, which asserted the endpoint this
   block deleted. §13 excludes HTTP e2e, so a broken e2e suite was worse than none.
10. **`tsconfig.build.json` gained `rootDir: "src"`** and excludes `prisma.config.ts`, fixing
    the `start:prod` path flagged in Block 3. `dist/main.js` is now where the script looks.

**Verified** Booted from the compiled output: `GET /api/v1/health` returns
`{"data":{"status":"ok","database":"up"},"meta":{...}}`, `/api/docs` returns 200, helmet
headers present with `x-powered-by` gone, an unknown route returns the error envelope with a
`requestId`, and 33 rapid requests produced 30×200 then 429s, so the throttler is live. Three
deliberately broken variables produced all three named problems and nothing else. Root
typecheck, lint, test (21 across both workspaces) and build green; no `as unknown as`,
`@ts-ignore` or `any` anywhere in our source.

**Left open** `@nestjs/config`, `jest`, `ts-jest` and `@types/jest` are all unused now —
worth pruning in Block 9 when the test suite is built out properly. The
`no-explicit-any: 'off'` ESLint override from Block 3 is still there.

---

## Block 5 — Auth module

**Prompt**

> '/home/hp/Usama Personal/dukkanify/docs/plan.md'
> start implimenting part 5
> /implement-from-spec
> /production-quality

**Produced** `POST /api/v1/auth/google` — a Google `id_token` verified server-side against
`GOOGLE_CLIENT_ID`, exchanged for a 7-day application JWT — plus the passport strategy and
the global guard that authenticates every route added from here on.

**Trade-offs and deviations**

1. **`auth/` has two ports, in `application/auth.ports.ts`.** The §4 tree shows `auth/` with
   no `domain/` folder, and that stays true: these are not business rules, they are the two
   things the service must not be soldered to. CLAUDE.md forbids `PrismaService` in a use
   case and the standing dependency grep looks for it in `application/` as well as `domain/`,
   so `AuthService` names `GoogleTokenVerifierPort` and `UserAccountRepositoryPort` and the
   module decides what satisfies them. The payoff is that the whole service is tested with
   no network and no database.
2. **A fourth file in `auth/infrastructure/`: `prisma-user-account.repository.ts`.** The §4
   tree lists three. This is the adapter behind the port above; without it the upsert has to
   live in the service, which is the rule this build treats as non-negotiable. Flagged rather
   than done quietly.
3. **`JWT_EXPIRES_IN` is now parsed to seconds at boot.** `@types/jsonwebtoken` types
   `expiresIn` as `StringValue | number`, so passing the raw `string` needed a cast — and a
   cast would have meant `JWT_EXPIRES_IN=banana` booting fine and failing at the first
   sign-in of the day. It is validated in `env.validation.ts` with the rest, and
   `AppConfig.jwt.expiresInSeconds` is a number. `.env.example` documents the units.
4. **The upsert reads back rather than transacting.** The first draft wrapped lookup and
   write in `$transaction` with a comment claiming it prevented duplicate accounts. Under
   READ COMMITTED it does not — the unique indexes on `googleId` and `email` do. So the
   transaction is gone, and a create that loses the race re-reads the row that won.
5. **No database read per authenticated request.** The claims carry the caller; every query
   that touches user data is scoped by owner id anyway (§8), so a token outliving its user
   reaches nothing. Stated in the strategy so the next reader does not add a lookup.
6. **An unverified Google email is refused.** Accepting one would let a fresh Google account
   claim an existing user by email alone, which is exactly what the email fallback in the
   upsert would then hand over.
7. **The guard converts passport's failures to `UnauthorizedError`.** Passport throws its own
   `HttpException`, which would answer 401 with `code: "HTTP_EXCEPTION"`. One condition,
   one code — the filter (§10) stays the only place that decides a status.

**Verified** Against the running API and real PostgreSQL: a garbage `id_token` returns 401
`UNAUTHORIZED` through the filter, never 500; an empty body and an unknown property both
return 400; `/api/docs` renders the endpoint. With a temporary non-public route (added,
exercised, removed), no token and a forged token both returned 401, an expired token returned
"Your session has expired", a valid token reached the handler with the caller attached, and
`/api/v1/health` stayed open. Against the database: repeat sign-ins return one row with a
refreshed profile, an existing email-only account is adopted rather than duplicated, and
three concurrent first sign-ins produced exactly one user. `JWT_EXPIRES_IN=banana` fails boot
with the named list. Root typecheck, lint, build and 32 tests green.

**Left open** No test exercises the Google verifier against Google — Block 12's browser login
is the proof. `StoreVersion` still has no producer. The unused `@nestjs/config`, `jest`,
`ts-jest` and `@types/jest` dependencies flagged in Block 4 are still installed.

---

## Block 6 — Stores domain layer

**Prompt**

> Block 6 — Stores domain layer
> /production-quality
> /implement-from-spec

**Produced** The layer that imports no framework: `Store` as an aggregate root with
`Category`, `Page`, `Section` and `Product`, the `Slug` and `Money` value objects, and
`StoreRepositoryPort` with its injection token. 81 vitest cases, none of which start
anything.

**Trade-offs and deviations**

1. **Money is an integer of minor units, not `decimal.js`.** The plan offered decimal.js "on
   the grounds that Prisma already depends on it" — Prisma 7 does not; it ships its own
   `Decimal` and `node_modules/decimal.js` is absent. So that route now means adding a
   dependency to the one layer meant to import nothing. The rule "money is never a `number`"
   means never a _fractional_ float; 999,999,999.99 in fils is three orders of magnitude
   inside `MAX_SAFE_INTEGER`. Written into the file, per the plan's instruction to decide
   once and say why.
2. **The domain uses the Zod schemas from `packages/contracts`.** It owns relationships —
   page counts, category references, one currency per catalogue. It does not own what a slug
   or a hex colour looks like; those are defined once in a pure schema package that the API,
   the model's tool schema and the web app all share. Re-stating the SKU regex here would be
   a second definition free to drift. `parseOrThrow` turns a `ZodError` into the
   `ValidationError` the filter already maps to 400.
3. **`Category` lives in `store.entity.ts`.** The §4 tree names four entity files and a
   fifth would be a deviation. It is also the honest place: a category has no behaviour and
   no meaning outside its store, and every rule about it — unique slugs, products pointing
   at a real one — is enforced by the aggregate root in that file.
4. **`Section.type` is a getter over `content.type`, not a field.** §6 requires the column to
   be written from the content; with no second field there is nothing it could be written
   from. `withContent` holds the type fixed, so an editor PATCH cannot silently turn a hero
   into a contact panel.
5. **No `position` fields.** The array is the order. The column exists because rows have
   none of their own, and the repository writes the index into it — one direction, so the
   two cannot disagree.
6. **The port takes no `ownerId` on reads.** A repository that scoped `findById` by owner
   would answer "not found" for someone else's store; §8 wants 403, decided in the use case,
   on a store whose owner it can see. `Store.isOwnedBy` is what the use case will ask.
7. **Ids come from the caller.** `Store.create` requires one, so an aggregate assembled
   before its first save takes ids from the layer about to write it. The domain has no
   business knowing what a cuid is, and a nullable id would poison every type downstream.
8. **A comment failed the CI dependency gate.** The grep in `ci.yml` matches `@nestjs/`
   anywhere in a domain `.ts` file, including prose — the file explaining the rule broke it.
   Reworded rather than loosening the check: the gate is blunt on purpose, and a regex that
   parses imports is a thing to maintain.

**Verified** `npm run typecheck`, `lint`, `build` and 113 tests green (94 api, 19 contracts).
The §3 grep — the CI form, `@nestjs/|@prisma/client|@anthropic-ai/sdk|generated/prisma|PrismaService`
across `modules/*/domain` — returns zero hits, and `domain/` imports exactly three things
from outside itself: `@dukkanify/contracts`, `zod` types, and `common/errors`. No spec file
imports a framework. Domain entities compile into `dist`; specs are excluded from the build.

**Left open** No `stores.module.ts` yet — Block 7 adds it with the repository binding, so
`STORE_REPOSITORY` is currently a token nothing is bound to. `Store.create` validates a
catalogue's shape but not that it holds eight products; that is a generation rule, enforced
by `StoreBlueprintSchema`, not a rule about every store that will ever exist.

---

## Block 7 — Stores application + infrastructure + presentation

**Prompt**

> Block 7 — Stores application + infrastructure + presentation
> /production-quality
> /implement-from-spec

**Produced** The five routes of §9: `POST /store`, `GET /store`, `GET /store/:id`,
`PATCH /store/:id/sections/:sectionId` and the public `GET /storefront/:slug`, over five
use cases, a domain↔DTO mapper, and a Prisma repository whose `save` writes a whole
aggregate in one transaction. 18 use-case cases against an in-memory fake.

**Trade-offs and deviations**

1. **The plan's two instructions about ownership contradict each other, and the gate breaks
   the tie.** It asks for "every query scoped by `ownerId`" _and_ for another user's store to
   return "403, not 404-by-accident". An owner-scoped `findById` can only ever produce the 404. So reads are not owner-scoped; `loadOwnedStore` fetches, then compares, then throws
   the right one. Only `listByOwner` filters, because "my stores" is the question there.
2. **The mapper is split across two layers.** The plan describes "Prisma model → domain →
   DTO" in `application/mappers/`, but the §3 grep forbids `generated/prisma` in
   `application/`. So the repository maps rows to aggregates and the mapper maps aggregates
   to DTOs. The chain is what the plan describes; the seam is where the dependency rule puts
   it.
3. **`POST /store` takes a blueprint, not a `StoreDto`.** "A store the client holds" needs a
   wire shape, and `StoreBlueprintSchema` is the one the system already agrees on — id-free,
   so a client cannot claim a URL or another account's row. It also means Block 8 has no
   mapping to write: generation validates a blueprint and hands it to the same
   `SaveStoreUseCase`. Two request schemas were added to `packages/contracts`
   (`SaveStoreRequest`, `UpdateSectionRequest`); Block 2 had no way to know their shape.
4. **A fifth use case, `get-storefront`.** The plan lists four and the §4 tree lists three,
   so the tree was already illustrative here. A public lookup by slug and an owner's lookup
   by id differ in key _and_ in authorisation; one `execute` with a union input would be two
   use cases wearing one hat, and the half that skips the ownership check is the half worth
   reading alone.
5. **`ZodValidationPipe` in `common/pipes/`.** The global `ValidationPipe` reads
   class-validator metadata, which cannot express a discriminated union or "every product's
   category must exist". CLAUDE.md allows either validator; Zod already defines these shapes.
6. **Children are deleted and rewritten, not diffed.** A store is generated and replaced as
   a unit. On a first save the three deletes match nothing — three no-op statements to keep
   create and replace on one path, which is cheaper than the branch.
7. **A lost slug race is a 400, not a 500.** `existsBySlug` then `save` is check-then-act;
   the unique index is the real arbiter. The repository translates Prisma's `P2002` on
   `slug` into a `ValidationError`, which is the layer whose job it is to know what a driver
   error means.
8. **Two Block 6 files changed.** `Slug` gained `tryFromText` (the fallback caller the
   original comment predicted now exists) and `withSuffix`; `findSection` now returns the
   section _and_ its position, because the editor needs both and two scans is how they come
   to disagree. Specs updated in the same commit.
9. **Products are ordered by SKU.** §6 gives `Product` no `position` column and cuid v2 is
   not time-sortable, so SKU is the only stable order available without a migration.
10. **Swagger documents routes and summaries, not response schemas.** The DTOs are
    Zod-inferred, and hand-writing `@ApiProperty` classes for a nested store would be ~200
    lines of doc-only code duplicating the contract. `@ApiBearerAuth()` is per route so the
    one public route is not shown with a padlock.

**Verified** Against the running API and real PostgreSQL, with two seeded users: `POST`
201, list 200, `GET` by id 200 for the owner, **403** for the other account, **404** for an
unknown id, `PATCH` 200 and the new headline survives a re-read, storefront 200 with no
token at all, `GET /store` 401 without one, `/api/docs` 200. The response carries
`"price":"249.57"` — a string, clamped from `249.567` — and product and store objects have
exactly the keys their DTOs declare, with no `createdAt` on a product and no `ownerId`
anywhere. A second store of the same name became `dukkan-al-oud-2`; an Arabic name became
`store`; replacing a store kept its id, slug and `createdAt` while swapping its categories.
In the database: 2 categories, 8 products, 3 pages and 4 sections per store after the
replace, so nothing was orphaned, and `direction` is written from the locale. Editing a
`HERO` into a `RICH_TEXT` is refused with a readable 400. Root typecheck, lint, build and
134 tests green; both §3 greps return zero hits.

**Left open** Nothing exports `SaveStoreUseCase` yet — Block 8 will add that line and reach
generation through the same write path. Products are saved with `imageUrl: null`; the
storefront is expected to render a placeholder rather than the database holding an invented
URL. `StoreVersion` still has no producer, and no endpoint moves a store from `DRAFT` to
`PUBLISHED`, so the storefront serves drafts on purpose.

---

## Block 8 — Generation module

**Prompt**

> Block 8 — Generation module

**Produced** `POST /api/v1/generate`: a prompt becomes a validated blueprint becomes a
persisted storefront. `AiGeneratorPort` with two first-class adapters behind it, the system
and repair prompts, a one-turn repair service, and per-account rate limiting. 27 new tests,
none of which touch a network.

**Trade-offs and deviations**

1. **The port returns `promptVersion` with the output, rather than the use case reading a
   constant.** `PROMPT_VERSION` lives beside the prompt text it versions, in
   `infrastructure/`, and an application layer cannot import that (§3). Having each adapter
   report which revision it used is also the honest arrangement: the mock reports `mock.1`,
   so a fixture store can never be mistaken for evidence about a real prompt revision.
2. **Normalisation is two rules, not five.** The plan lists slugify, dedupe SKUs, clamp
   prices and repair category refs. Three of those are already guaranteed — the contract
   refuses a bad slug or a dangling category reference, and `Money.fromNumber` clamps to two
   places at the one boundary where a JSON number becomes money. Re-implementing them here
   would be a second opinion free to disagree with the first. What the contract _cannot_
   express is per-store uniqueness, because it validates one document: duplicate SKUs and
   duplicate page slugs would hit `@@unique([storeId, …])` at write time. Those two are
   fixed in code, and the comment says why the rest are not.
3. **Generation reuses `SaveStoreUseCase`.** Block 7 shaped `POST /store` around the
   blueprint precisely so this block would have no mapping, no id minting, no slug
   allocation and no transaction of its own to write. `StoresModule` now exports it.
4. **`thinking: { type: 'disabled' }` on the Claude call.** Adaptive thinking is on by
   default on current models and shares the `max_tokens` budget with the answer, so an
   8,000-token budget could be spent reasoning and truncate the store. This is structured
   extraction against a fixed schema, and the whole budget should go to the blueprint.
5. **A truncated answer is caught in the adapter, not the validator.** `stop_reason:
"max_tokens"` means the tool input is cut mid-object; letting that reach the repair turn
   would spend a second call to be told the store is malformed. It answers 422 with "try a
   shorter description" instead.
6. **A 401 from Anthropic is deliberately _not_ a 503.** Timeouts, connection failures, 429s
   and 5xxs become `AiProviderUnavailableError`; a rejected key means this application is
   misconfigured, and "please try again shortly" would be a lie. It bubbles to a 500 with a
   request id.
7. **The throttler became global, and authentication now runs before it.** The first attempt
   was a route-scoped guard, and testing it showed the flaw: `@Throttle()` is metadata on the
   handler, so _every_ throttler guard in the chain honours it — the global IP-keyed guard
   tightened itself to 5/min for that route, and one user's generations rate-limited another
   user on the same address. Two throttler guards do not compose. There is now one
   `ScopedThrottlerGuard`, keying on the account when a guard has established one and the
   address otherwise, registered after `JwtAuthGuard`. Verifying a JWT is an HMAC with no
   database round trip, so the unauthenticated traffic this ordering exposes is cheap to
   refuse.
8. **The mock is written as product copy, not as filler.** Four keyword-driven profiles
   (oud/perfume, bukhoor, gifts, and a home-goods default) with eight real products each.
   It is what the frontend is built against and almost certainly what gets demonstrated, so
   generic placeholder text would show up in the demo. It honours the requested locale so an
   Arabic store renders right-to-left, but its copy stays English — a fixture that pretended
   to translate would be a worse lie than one that is plainly a fixture.

**Verified** Against the running API and real PostgreSQL, `AI_PROVIDER=mock`: `POST
/generate` returns **201** and persists a complete store — 8 products, 3 categories, 3 pages
(3/1/1 sections), canonical page slugs, unique SKUs, every product resolved onto a category
of its own store, `"price":"720.00"` as a string, and `promptVersion: "mock.1"`. An Arabic
prompt produced `locale: ar, direction: RTL`, and the generated store is readable at
`GET /storefront/:slug` with no token. With the provider fault-injected in the compiled
output: malformed output twice returns **422** `BLUEPRINT_GENERATION_FAILED` listing the
offending fields, never a 500; a provider outage returns **503**. Unauthenticated is 401 and
a four-character prompt is 400. Rate limiting: six generations from one account gave
5×201 then 429, while a second account on the same address still got 201 and the throttled
account could still `GET /store`. Root typecheck, lint, build and 160 tests green; both §3
greps zero hits.

**Left open — the one gate item not met.** `AI_PROVIDER=claude` was **not** run against the
real API: `apps/api/.env` has no `ANTHROPIC_API_KEY` (it carries a `GEMINI_API_KEY`, and
`AI_MODEL` is set to `gemini-3.5-flash`). The adapter is covered by unit tests with the SDK
faked — happy path, no tool call, truncation, unreachable API, timeout via `AbortController`,
and a rejected key — but a live call is still owed. To make it: set `ANTHROPIC_API_KEY`,
set `AI_MODEL=claude-sonnet-5` (or unset `AI_MODEL` so the per-provider default applies —
otherwise the Gemini model name is sent to Anthropic and 404s), and `AI_PROVIDER=claude`.
Products still persist with `imageUrl: null`; `StoreVersion` still has no producer.

---

## Block 8b — Gemini adapter

**Prompt**

> Key verified. Available models: <paste the list>. Use <exact flash model id> for AI_MODEL.
> Now build the Gemini adapter as you scoped it. Since responseSchema is a JSON Schema
> subset, keep the full Zod schema as the validator and add a comment in gemini.generator.ts
> naming which constraints (regex pattern, min/max length) the API cannot enforce — so the
> repair turn's role is documented rather than implicit.
> Install @google/genai. Adapter + spec with the SDK faked (happy path, malformed JSON,
> schema violation, 429, network error) + the 'gemini' factory case + architecture.md §14
> updated, all in the same commit.
> Map 429 distinctly: per-minute limit versus daily quota exhausted.

**Produced** `GeminiGenerator` behind the existing `AiGeneratorPort`, 13 spec cases with the
SDK faked, the `case 'gemini'` factory branch, `@google/genai`, `.env.example`, and a
rewritten §14.

**Trade-offs and deviations**

1. **The model id came from the API, not the prompt.** The message arrived with its
   placeholders unfilled (`<paste the list>`), so rather than ask, the key was used to list
   models. `gemini-3.5-flash` is real, is already what `.env` and `DEFAULT_AI_MODEL` carry,
   and no change was needed. (Reading it required matching dotenv's inline-`#` handling —
   a naive regex swallowed the trailing comment and produced a 114-character "key" that
   failed authentication, which briefly looked like a bad key.)
2. **No response schema is sent at all — a bigger deviation than the brief anticipated.**
   The brief assumed the schema would be accepted and merely under-enforced. It is
   rejected: `400 INVALID_ARGUMENT` for the whole blueprint schema, and pruning every
   documented-unsupported keyword did not help. Bisecting against the live API located it —
   each of `store`, `theme`, `categories`, `products` is accepted alone, `pages` is not, and
   every part _inside_ `pages` is accepted alone, so the limit is structural rather than one
   bad keyword. `responseMimeType: 'application/json'` is kept, because guaranteeing the
   body parses is the part a prompt cannot promise.
3. **The comment names what is unenforceable, as asked, and is sourced rather than guessed.**
   The SDK's own doc comment for `responseJsonSchema` lists the supported keywords; a script
   walked our generated schema against that list, so the table names exactly the five that
   appear in our contract — `pattern`, `minLength`/`maxLength`, `const`, `exclusiveMinimum`,
   `default` — and where each one lives.
4. **`thinkingConfig: { thinkingBudget: 0 }`.** Thinking is on by default and its tokens come
   out of `maxOutputTokens`: a 20-token probe returned `MAX_TOKENS`, an empty body and
   `thoughtsTokenCount: 17`. Left alone, an 8,000-token budget can be spent entirely on
   thoughts. Same reasoning as the Claude adapter, but here it was measured rather than
   reasoned about.
5. **Both 429 flavours are 503, distinguished by message and log level.** §10 has no status
   meaning "come back tomorrow", and inventing one would change the error table for one
   vendor's quota model. A per-minute limit says "busy, try again in about 27 seconds"
   (quoting `retryDelay` when present) and logs at warn; an exhausted daily quota says "try
   again tomorrow" and logs at error, because it needs a person rather than patience. The
   classification reads the quota id out of the error body defensively, since the SDK's
   `ApiError` exposes only `status` and the raw message.
6. **Unparseable output is returned, not thrown.** Where the Claude adapter treats a missing
   tool call as a 422, this one hands the raw text back so the validator rejects it and the
   repair turn quotes the model's own output at it. That is the failure the repair turn was
   built for, and JSON mode makes it rare.

**Verified** 172 tests green (153 api, 19 contracts), typecheck, lint and build clean; the
§3 greps extended to `@google/genai` still return zero hits in `domain/` and `application/`.
Live, with `AI_PROVIDER=gemini`: the app boots reporting `gemini (gemini-3.5-flash)`, and
`POST /generate` reached the real API and came back **503 "has reached its daily limit"**
— the quota classification working against a genuine quota error rather than a fixture,
logged at error level by the adapter as designed.

**Left open** The free-tier daily quota was exhausted by the schema bisecting, so a
_successful_ end-to-end generation through Gemini is still owed — try again after the quota
resets, with `AI_PROVIDER=gemini`. Expect more repair turns than the Claude path would need,
since on this provider the repair turn is the primary enforcement of formats. §14 records
both of these.

---

## Block 9 — Backend test suite

**Prompt**

> Block 9 — Backend test suite
> /production-quality /implement-from-spec

**Produced** The §13 table, completed and de-duplicated. `GenerateStoreUseCase` now has a
spec of its own — prompt in, persisted storefront out, with `MockGenerator` for a model and
a Map for a database — and the doubles the generation and stores tests share moved out of
the spec files into `apps/api/test/`: `InMemoryStores`, `ScriptedGenerator`,
`mockBlueprint()` and the hand-written `blueprintFor()` fixture. 182 tests across the two
workspaces, none of which touch a database or a network.

**Trade-offs and deviations**

1. **The doubles live in `apps/api/test/`, not beside the specs.** `tsconfig.build.json`
   excludes `test/`, so a fake can never reach `dist/`, and one repository fake now serves
   both the stores use cases and the generation use case. Copies drift, and two fakes that
   disagree about what a repository does test nothing but themselves.
2. **The fixture file imports nothing but `@dukkanify/contracts`.** `store.entity.spec.ts`
   takes its theme from it, and the block 6 gate says a domain test imports no framework —
   which a shared fixture would have quietly broken had it pulled in `MockGenerator` and its
   `@nestjs/common` decorators. The mock-derived blueprint therefore sits in
   `scripted-generator.ts`, which only the generation specs import.
3. **`ScriptedGenerator` repeats its last answer rather than running out.** The two copies it
   replaced differed exactly there: one returned `undefined` past the end of the script, the
   other clamped. Clamping is what a real failure looks like — a model that cannot satisfy
   the contract usually cannot satisfy it twice — and it lets a one-answer script exercise
   the repair turn without writing the same rejection out twice.
4. **The invisible characters in the prompt-sanitising tests are written as escapes.** They
   were literal, which fails `no-irregular-whitespace` inside a template literal and which
   any editor or reviewer could silently "fix" — deleting the input the test exists to check.
   `\u200B` and `\u0000` say what they are.
5. **No test asserting the Claude adapter survives malformed JSON.** §13 names that case, but
   this adapter uses tool use: the SDK hands back a parsed object or the model never called
   the tool, and both are covered (422 for no tool call, 422 for a truncated one). The
   malformed-body path is real on Gemini, which asks for JSON text, and is tested there.

**Verified** `unshare -rn npm run test -w api` — 163 tests green inside a namespace with no
network interface at all, which is the §13 claim proved rather than asserted. 19 contracts
tests green; typecheck and lint clean across all three workspaces; the §3 dependency grep
still returns zero hits and no domain spec imports a framework.

**Left open** The README sentence the plan asks for — that the backend suite needs no
infrastructure — belongs to block 15, the block that creates `README.md`.
`apps/api/README.md` is still Nest boilerplate and is already on block 15's sweep list.

---

## Block 9b — Backend smoke test against the real stack

**Prompt**

> backend proper working?

**Produced** No code. The unit suite proves the logic; this drove the HTTP surface against
the running API and the real container, with application JWTs minted for two seeded
accounts, since a Google `id_token` cannot be obtained here. Confirmed working: health,
401 on a private route with no token and with a forged one, `POST /generate` (201, eight
products, three pages, price as a string, `promptVersion mock.1`), list, get, **403 rather
than 404** for another account's store, 404 for a missing one, the public storefront with no
token, `PATCH` of a section surviving a re-read, 403 and a type-change rejection on it, a
501-character prompt rejected with the offending field named, Arabic stored `ar`/`RTL`,
`POST /store`, Swagger, and the rate limits — exactly five generations per minute per
_account_, thirty requests per minute globally. Smoke data deleted afterwards.

**Found**

1. **Unknown body fields are stripped, not rejected.** `{"prompt": "…", "isAdmin": true}`
   returns 201 with the extra key dropped. Safe — it never reaches a use case — but block 4
   said the global pipe runs `forbidNonWhitelisted`, and bodies are actually validated by
   `ZodValidationPipe`, which strips. A behaviour to defend deliberately, not to discover
   during the live round.
2. **An Arabic prompt gets Arabic layout and English copy.** `locale`, `direction` and the
   theme fonts switch correctly; `MockGenerator` matches Arabic keywords but its catalogue
   text is English. Real Arabic copy needs a hosted provider, which §14 already records as
   unproven end to end.

---

## Block 10 — Web foundation and design system

**Prompt**

> start block 10
> `/implement-from-spec` `/production-quality`

**Produced** The Emirati palette as tokens, three fonts, the API boundary and the Auth.js
config — everything blocks 11–14 build on, and no page. `globals.css` carries sand, oud
brown and gold leaf in place of the shadcn greyscale; `lib/fonts.ts` loads the three
families the contract's font enum can name; `lib/api-client.ts` unwraps `{ data, meta }`,
validates it and turns a status into a typed `ApiError`; `lib/auth.ts` exchanges the Google
`id_token` for the application JWT; `components/mashrabiya.tsx` is the one motif; root
`loading.tsx` and `error.tsx` cover every route until a group needs its own.

**Trade-offs and deviations**

1. **The access token is kept off the session object.** Auth.js serves the session at
   `/api/auth/session`, so anything placed there is readable by any script on the page.
   The API token stays on the encrypted cookie and `getAccessToken` decrypts it with
   `getToken`, which means every call carrying it is made from a Server Component or a
   Server Action and the browser never holds a bearer token. Both cookie names are tried
   rather than guessing the `__Secure-` prefix from `NODE_ENV`.
2. **`schema` is a required option on `apiRequest`, not an optional one.** An API response
   is external input, CLAUDE.md admits no unvalidated external input, and the alternative —
   `as StoreDto` at every call site — is the cast the same file bans. A drifted response
   therefore fails loudly at the boundary instead of rendering `undefined` three components
   deep.
3. **One `ApiError` with a `kind` union, not eight subclasses.** Every failure is the same
   event; only the sentence and whether to offer a retry differ. The status → kind table and
   the fallback sentences live next to each other, so a new status is two lines.
4. **The palette is hex, not oklch.** `ThemeTokensSchema` validates hex and every generated
   theme arrives as hex, so the product's own palette is written in the same language as the
   one it sits beside. The greyscale `--chart-*` and `--sidebar-*` tokens shadcn shipped were
   deleted — nothing installed reads them.
5. **The Next boilerplate `app/page.tsx` is deleted rather than edited.** Block 11 puts the
   real landing page at `(marketing)/page.tsx`; keeping the starter's logo and "Get started
   by editing" until then is template code sitting in the repository, which PDF §8 lists as a
   disqualification condition. **`/` is a 404 until block 11 lands.**
6. **Font variable names are written twice.** `next/font` extracts its arguments at compile
   time and rejects a reference, so the loader calls and the `CSS_VARIABLE` record repeat the
   three names. The record is keyed by the contract's font enum, so a font added there
   without a loader is a type error rather than a blank page.
7. **The toaster sits bottom-centre.** Sonner's corner positions are physical, not logical,
   so a corner chosen once would land on the wrong side of an Arabic page.
8. **An extra file beyond the block's list: `types/next-auth.d.ts`.** It augments
   `@auth/core/*` rather than `next-auth` — `next-auth` only re-exports those types, and
   augmenting a re-export declares a second, unrelated interface whose fields never appear.

**Verified** `npm run build -w web`, typecheck and lint green across all three workspaces.
The RTL claim was tested rather than asserted: with `dir` flipped to `rtl` and the app
rebuilt, the CSS bundle hash was **byte-identical** (`2e08c99bc6e4e81a`), which is what "no
CSS changes" means. The compiled stylesheet contains **zero** `ml-`/`mr-`/`pl-`/`pr-` rules,
a stronger check than grepping the source since Tailwind only emits what is used. A scratch
page (removed before the commit) confirmed the fonts self-host and are served, the motif
renders as a tiling `<pattern>`, and the palette, the `:lang(ar)` heading rule and the dark
tokens are all in the bundle with no greyscale left over.

**Left open** Google OAuth credentials are in `.env.local`, but the sign-in flow cannot run
until block 12 adds the `[...nextauth]` route and the login page. The `spacing` theme token
(`compact` | `comfortable` | `generous`) has no mapping yet — block 13 owns it, when there
are sections to space.

---

## Block 11 — Landing page

**Prompt**

> start Block 11 — Landing page
> `/production-quality` `/implement-from-spec`

**Produced** `app/(marketing)/page.tsx` — one Server Component, no client JavaScript in the
tree. Header, hero with the mashrabiya and a single primary call to action, a three-step
"how it works", a strip of three sample storefronts, footer. 172 B of page-specific
JavaScript, statically prerendered.

**Trade-offs and deviations**

1. **The sample storefronts are real generator output, styled by the real mechanism.** The
   names, taglines, categories and palettes are lifted from `MockGenerator`'s own profiles,
   and each card is painted through `themeToCssVariables` — the same function the storefront
   renderer will use in block 13. A landing page showing output the product cannot produce
   is the oldest lie in software, and this one can be checked against `POST /generate`.
2. **Two files from block 10 changed, both because this block's gate found them.**
   - Lighthouse mobile came in at **84**, with eleven font files (~420 kB) preloaded ahead
     of the first paint. `Noto_Kufi_Arabic` is now `preload: false` — it is a _generated_
     theme's choice, so most visits never need it — and IBM Plex dropped the 700 weight
     nothing was using. That is 84 → **93**, LCP 4.4 s → 3.0 s.
   - The secondary call to action rendered as plain text: shadcn's outline variant uses
     `--border`, which was 1.4:1 against sand. `--border` and `--input` now carry different
     budgets — a hairline that only separates content stays quiet, an edge a person can act
     on meets the 3:1 of WCAG 1.4.11. This also fixes form fields before block 12 needs them.
3. **`outlineLink()` composes through `cn`, not by appending a class.** `buttonVariants` is
   CVA, which concatenates without resolving conflicts, so `border-border` and `border-input`
   both survived and CSS source order decided — which is why the first attempt at the fix
   changed nothing on screen. `cn` runs tailwind-merge, which keeps the last one.
4. **The headline is two spans, not one balanced line.** `text-balance` broke "Describe your
   shop. Get a storefront." into three ragged lines on mobile, the second ending mid-sentence.
   The sentence has two halves; they are now two lines at every width.

**Verified** Lighthouse mobile at a real 375 × 812 viewport, three runs, all identical:
**performance 93, accessibility 100**, best practices 96, SEO 100 — the gate asks for ≥ 90 on
the first two. FCP 0.8 s, CLS 0. Horizontal scroll was measured rather than eyeballed:
`documentElement.scrollWidth` equals `clientWidth` at 375, 768 and 1440, with zero elements
extending past the viewport. Grep confirms no `"use client"` anywhere in the page's tree.

Worth recording for the live round: Chrome headless silently enforces a **500 px minimum
window width**, so the first "375 px" screenshots were rendered at 500 and cropped, which
made the page look badly broken when it was not. Lighthouse's device emulation and a
CDP-driven viewport both give a true 375.

**Left open** Lighthouse logs one console error: Next prefetches `/login`, which does not
exist until block 12, so the RSC request 404s. Left alone rather than papered over with
`prefetch={false}`, since block 12 is what makes it real — it is the only thing keeping best
practices off 100.

---

## Block 12 — Login and dashboard

**Prompt**

> Start Block 12 — Login and dashboard
> `/production-quality` `/implement-from-spec`

**Produced** `(auth)/login`, `(dashboard)/layout.tsx` + `dashboard`, the Auth.js route
handler, and `middleware.ts`. Sign-in is a Server Action, the store list is fetched on the
server with the caller's bearer token, and there is no `useEffect` and no database client in
`apps/web` at all.

**Trade-offs and deviations**

1. **The guard is middleware, not just the layout — because the layout version does not
   work.** The App Router renders a layout and its page **in parallel**: with only the
   layout check, `/dashboard` answered **200** with an error boundary, having already called
   the API and had it refuse. And once the shell is flushed, `redirect()` can only be
   delivered inside the RSC payload, never as a status code — which is why the login page's
   "already signed in" redirect also silently did nothing. Both decisions moved to
   middleware, where they happen before the first byte. The layout keeps its own check as
   defence in depth for a route added under `(dashboard)/` after the matcher is next edited.
2. **A session carrying `error` is treated as signed out.** Google succeeded, the token
   exchange did not, so every call from the dashboard would fail one at a time. The
   middleware turns it away with the reason in the query string and the login page has a
   sentence for it.
3. **`config.matcher` holds string literals, not the constants beside it.** Next evaluates
   that export statically and fails the build on an identifier — a second instance of the
   same constraint `next/font` imposes. Worth knowing before it costs an hour.
4. **One "Create Store" on screen, never two.** The header button is rendered only when
   there is a list under it; on a first visit the empty state carries the action. Two
   identical primary buttons make a person choose between them instead of clicking. The
   label stays exactly "Create Store" in both places, per PDF §4.3.
5. **Dates are formatted in `Asia/Dubai` with a fixed locale**, so a store's "updated" line
   says the same thing on every deployment rather than following the server's clock.

**Verified** The whole routing matrix, as HTTP status codes rather than by eye: no session →
`/dashboard` and `/builder/x` both **307 → /login**; `/login` and `/` stay 200; a signed-in
session on `/login` → **307 → /dashboard**; a session with a failed exchange → **307 →
/login?error=token-exchange-failed**, and the login page explains it. An unknown `?error=`
value renders the generic sentence rather than echoing the query string.

The dashboard was rendered for three real sessions by minting Auth.js session cookies with
`encode` and API tokens signed with the API's own secret: **"Welcome Abdullah", 2 stores so
far** with both cards, taglines, draft badges and slugs — all of it from `GET /store` with a
bearer token — and the genuine empty state for an account with none. Screenshots at 375 and
1440 with no horizontal overflow. The streamed skeleton in `(dashboard)/loading.tsx` was
caught on camera before the list arrived, which is the proof it exists.

Google's own wiring was checked end to end short of a human: `POST /api/auth/signin/google`
answers **302 to accounts.google.com** with the configured client id, PKCE challenge, the
`openid profile email` scope and the callback URL.

**Left open** **The one thing I cannot do is sign in as you.** Real Google login needs a
browser and your account, and Google will only accept a redirect URI registered in the
Cloud console — `http://localhost:3000/api/auth/callback/google`. Run `npm run dev` (port
3000, not the 3100 used for these checks) and sign in once to close that gate.

`/dashboard/new` and `/builder/[storeId]` are linked but do not exist until block 13, so the
"Create Store" button and the store cards 404 for one commit — the same ordering as `/login`
in block 11.

---

## Block 13 — Prompt interface, generation, live preview

**Prompt**

> Start Block 13 — Prompt interface, generation, live preview
> `/production-quality` `/production-quality`

**Produced** The demo. `features/generation/{prompt-composer.tsx,actions.ts}`, the five
section components plus a shared `SectionHeading`, `section-renderer.tsx`,
`features/storefront/storefront.tsx` (the theme wrapper both contexts share), and three
routes: `/dashboard/new`, `/builder/[storeId]`, `/preview/[slug]`.

**Trade-offs and deviations**

1. **The section renderer is a `switch`, not the object registry §5 sketched — and §5 has
   been rewritten to match.** `Record<SectionType, ComponentType<Props>>` widens every
   component to the whole union, so a component cannot be typed against its own content
   variant without a cast at the call site, and CLAUDE.md bans casts. A switch narrows for
   free. The exhaustiveness guarantee is unchanged and was **negative-tested**: deleting the
   `CONTACT` case fails with `Type '{ type: "CONTACT"; … }' is not assignable to type
'never'`, and adding a `TESTIMONIALS` member to `SECTION_TYPES` fails contracts'
   `EVERY_SECTION_TYPE_HAS_CONTENT` before the web app is even reached.
2. **Sections take `store`, not `theme`.** Also a §5 correction: `CATEGORY_GRID` and
   `PRODUCT_GRID` hold slug _references_ into the catalogue and cannot render from content
   alone. The theme is not passed as a prop at all — it becomes `--brand-*` properties on the
   wrapper, which is what block 14's colour pickers will write to directly.
3. **The prompt's language decides the store's language.** No language switch: a control
   that repeats what the writer already told us. Arabic characters in the prompt mean
   `locale: 'ar'`, which the API stores and the storefront renders right-to-left. Verified in
   a browser — the Arabic example chip produced `lang="ar" dir="rtl"` with the computed
   direction `rtl`.
4. **The root `app/loading.tsx` was deleted.** It made _every_ route stream a shell, and a
   flushed shell fixes the status line — `/preview/no-such-shop` answered **200** with a 404
   page inside it, which a crawler reads as "this shop exists". Moving the fetch into
   `generateMetadata` was not enough; removing the boundary is what made it a real 404. The
   dashboard keeps its own skeleton, so nothing lost a loading state.
5. **`api-client`'s `schema` option is now a structural `ResponseSchema<T>`, not
   `z.ZodType<T>`.** `@dukkanify/contracts` compiles to CommonJS, so its declarations resolve
   zod's `.d.cts` types while the web app resolves the ESM `.d.ts` — the same library, two
   nominally unrelated type identities, and passing `StoreDtoSchema` into a `z.ZodType<T>`
   parameter fails with _"two different types with this name exist"_. Asking only for
   `safeParse` sidesteps it and makes the client indifferent to which validator produced the
   schema.
6. **Category tiles resolve their own anchor.** They linked to `#products-<slug>`, but the
   model usually emits one catalogue-wide `PRODUCT_GRID` whose anchor is `#products` — so
   every tile pointed at nothing. The tile now checks which categories actually have a grid
   of their own. A link that silently does nothing is the worst kind: it looks like it worked.
7. **Product tiles are drawn, not fetched.** `imageUrl` is null on every product this app has
   ever saved, so each tile is a gradient from the store's own palette, angled by the SKU,
   with the product's initials in the display face. A broken image or someone else's stock
   photo would both be worse than admitting there is no photography yet.

**Verified** In a real browser, driven end to end: prompt typed → counter reads `47 / 500` →
submit → button becomes "Building your shop…" → **landed on `/builder/<id>`**. The
no-refresh claim was measured rather than asserted: a marker set on `window` before
submitting **survived** the navigation, which a document reload would have wiped. The
rendered store carried `--brand-primary: #6B4A2B` and `--brand-space: 5.5rem` from the
generated theme, five sections and eight products. The same store on `/preview/<slug>`
answered 200 **with zero cookies in the jar**, and an unknown slug answered **404**.
Typecheck, lint, both builds and 182 tests green.

**Two hours lost to my own tooling, worth recording:**

- **`A "use server" file can only export async functions, found object.`** `actions.ts`
  exported an initial-state constant. Neither `tsc` nor `next build` catches this — it throws
  the first time the action is _called_, and the composer just sat there saying "Building your
  shop…". A green build is not evidence that a Server Action runs.
- **`npm run build` into a running dev server's `.next` destroys it.** I did this twice,
  which is what broke `localhost:3000` for the user mid-block. Production builds now happen
  only with the dev server stopped.
- **The API was pointed at a different database than I was seeding.** `apps/api/.env` has the
  container URL commented out in favour of the host PostgreSQL on 5432; every smoke user I
  created went into the container on 5433, and generation failed with
  `Store_ownerId_fkey`. The host database is also where a **real Google sign-in** turns out to
  have already succeeded — a real Google account with a cuid id, created by the token
  exchange, which closes block 12's one open gate.

**Left open** `MockGenerator` writes English copy even for `locale: 'ar'`, so an Arabic store
is correctly right-to-left with English words in it — §14 records this, and only a hosted
provider fixes it. Block 14 adds the editor panel beside the builder preview.

---

## Block 14 — Editor mode

**Prompt**

> Start Block 14 — Editor mode
> `/production-quality` `/implement-from-spec`

**Produced** `features/builder/{builder-store.ts,editor-panel.tsx,editable-storefront.tsx,
section-fields.ts,actions.ts}`, plus `storefront-frame.tsx` extracted so the builder and the
public storefront share one frame. Click a section, edit its words, drag a colour, save.

**Trade-offs and deviations**

1. **The same section components render in both contexts, from one file.** The builder's
   canvas imports `SectionRenderer` unchanged and runs it inside a client component; the
   public route server-renders it. That is architecture.md §5's "one set of components, two
   contexts" made literal, and it is why an edit cannot make the builder and the live shop
   disagree about how a section looks.
2. **An edit is applied by handing the result back to the contract.** Rather than a typed
   setter per field per section type — five switches of five branches, each a chance to
   assign the wrong key — `withField` spreads the change and calls
   `SectionContentSchema.safeParse`. Parsing _is_ the type guard: a real `SectionContent`
   comes back with no cast, and an edit that would empty a required headline is refused with
   the same sentence the API would have sent.
3. **Text and colour are edited by deliberately different mechanisms.** Text is state: draft,
   validate, save, roll back. Colour is not — a picker writes `--brand-primary` straight onto
   the canvas element, so a drag repaints every section in one style write with no React
   render. Measured: `#8A5A3B → #1d4ed8` on the property, and the hero button's computed
   background followed from `rgb(138, 90, 59)` to `rgb(29, 78, 216)`.
4. **Colours are preview-only, and the panel says so.** There is no endpoint that persists a
   theme — `POST /store` would replace the whole aggregate and reassign every id. A picker
   that silently fails to save would be worse than one labelled honestly. §14 gains this at
   block 15.
5. **The fields are controlled, with a buffer for keystrokes the contract refuses.** An
   emptied headline on the way to retyping it has to stay on screen; the draft keeps the last
   _valid_ content, `typed` keeps what is in the box. Both are cleared on save and on
   rollback, so a refused save restores the panel as well as the canvas.

**Verified** All three gate conditions, in a browser:

- **Persistence:** hero headline edited → saved → **hard reload** → the new headline is still
  there, and the public `/preview/:slug` shows it too.
- **Colour:** one property write repaints every section instantly (numbers above).
- **Rejection:** the section row was deleted from the database _while the page held it_, so
  the `PATCH` was refused by the API rather than by anything the client could have known.
  The canvas showed the optimistic edit while typing, then rolled back to
  `"What is the occasion?"` — canvas **and** input box — with the toast _"That section no
  longer exists. Reload the page to see the current shop."_

Also verified: selecting a section from the canvas swaps the panel to that section's fields
(`Heading / Email / Phone / Address` for contact), the dirty state reads "Unsaved changes",
and the save button is disabled while clean. Typecheck, lint, build and 182 tests green; the
RTL grep still finds zero physical spacing utilities.

**Two bugs the browser found that the type checker could not:**

1. **Rollback restored the first keystroke, not the original.** `edit()` captured its own new
   content as the rollback point, so a refused save "restored" the section to `"T"`. The
   caller now passes the content it edited _from_.
2. **The input kept the rejected text after a rollback.** The boxes were uncontrolled, so the
   canvas said one thing and the panel another — and the same refused text was one click from
   being saved again.

**Left open** Colour edits are not persisted (see above). `StoreVersion` still has no
producer. Block 15 is the README, the prompt log's final pass, and §14 being made true.

---

## Block 15 — Documentation and submission

**Prompt**

> Start Block 15 — Documentation and submission

**Produced** `README.md` — what it is, how to run it, configuration, three mermaid diagrams,
the API table, five screenshots, the AI tooling and prompt-engineering section the brief
requires, and Known limitations carried over from §14. Plus `docs/screenshots/`, an updated
§14, and the §8 disqualification sweep.

**Trade-offs and deviations**

1. **This log is now committed, and block 2's note about it is out of date.** It said the
   prompt documentation would have to be carried by the README because `docs/prompts.md` was
   gitignored. Asked and answered the other way: the ignore is removed and the full log ships.
   The README still carries a self-contained account of the workflow, so the requirement is
   met twice over rather than depending on one file.
2. **One redaction.** Block 13's entry named the Google account found in the database. A
   personal email address is not something a submission needs to carry, so it now says what
   it needs to say without it.
3. **Screenshots are the ones taken during verification**, not staged for the README. The
   dashboard, builder and storefront images are real runs against the real stack, which is
   why the store names in them are the mock generator's own output.
4. **Deleted rather than kept:** `apps/api/README.md` (Nest's boilerplate) and the five
   unused Next starter SVGs in `apps/web/public/`. PDF §8 lists copied template material as a
   disqualification condition, and neither file had anything to do with this product.

**Verified** The §8 sweep is clean: **zero** `.js`/`.jsx` source files (the four remaining are
tooling configs — eslint, postcss, commitlint), **zero** uses of `any` in source, **zero**
`@ts-ignore` or `as unknown as`. Typecheck, lint, 182 tests and both builds green, and
re-verified from a **fresh clone into a clean directory** so the instructions in the README
are the instructions that actually work.

**The clean-clone gate earned its place — it found two bugs nothing else could have.**

1. **A fresh clone failed everything.** `@dukkanify/contracts` is consumed through its
   `dist/`, which is correctly _not_ committed, so `typecheck`, `lint` and 12 of 15 test files
   failed on `Cannot find module '@dukkanify/contracts'` until it was built. Every check had
   been passing locally for fifteen blocks because `dist/` was already sitting there. The root
   `prepare` script now builds contracts as part of `npm install`, so the README's first
   command is enough.
2. **`npm run build` needed environment files that a reviewer would not have.**
   `NEXT_PUBLIC_API_URL` and `AUTH_SECRET` were validated at module load, and `next build`
   executes those modules to collect page data — so a missing _runtime_ variable failed the
   _build_ with `Failed to collect page data for /preview/[slug]`. Both are now read on first
   use: same schema, same sentence, raised at the first request that needs the value rather
   than at import. A clone that cannot be built is worse than one that cannot be started.

Both fixes have their own commits, and the gate was then re-run from a fresh clone **with no
`.env` files present at all**: typecheck clean, lint clean, 182 tests green, both builds green.

**Left open** Nothing in the plan. What remains is what §14 says remains — a successful
generation through a hosted provider, persisted theme edits, and the bonus features that were
never in scope.

---

## Follow-up — the second scaffold readme

**Prompt** "Why readme no updated?"

**What it produced** The root `README.md` was updated and committed in block 15, so the
question pointed at a different file: `apps/web/README.md` was still the create-next-app
boilerplate — "This is a Next.js project bootstrapped with create-next-app", ending in a
Vercel deploy link. The block 15 sweep deleted Nest's `apps/api/README.md` and the five unused
starter SVGs, and missed this one. Deleted.

**Trade-off** None worth the name. Nothing referenced the file, and a workspace readme would
only repeat what the root readme already says about running the app — two sets of run
instructions that can disagree is worse than one. The root `README.md` stays the only readme
in the repository.

---

## Follow-up — publish, unpublish, delete, and a private preview

**Prompt** How to deploy; what the public publish link is; add a Preview button for drafts;
fix the published action buttons; fix duplicate step numbers on the landing page; commit and
push.

**What it produced**

- `PATCH /store/:id/status` and `DELETE /store/:id`, with ownership inside the use cases.
- Public `/preview/:slug` serves only `PUBLISHED` stores; drafts 404 so a URL cannot leak a
  shop in progress.
- Signed-in `/builder/:id/preview` renders the same storefront without the editor.
- Builder actions sit in one row: Preview, View live (when published), Publish/Unpublish,
  Delete.
- Landing-page lists use `list-none` so the step badge is not doubled by the browser marker.

**Trade-off** No custom domain. The shareable URL is still `/preview/:slug` on the web app.

---

## Follow-up — Gemini Flash-Lite 400 and a blank generate error

**Prompt** Screenshot of "An unexpected error occurred" on generate; should display a proper
error and fix it.

**What it produced** Live bisect: `gemini-3.5-flash-lite` accepts JSON mode and rejects
`thinkingConfig: { thinkingBudget: 0 }` with `400 INVALID_ARGUMENT`. `GeminiGenerator` now
omits that field on lite models, maps Gemini 400/403/404 to `AiProviderUnavailableError`
(503) so the form shows the reason instead of a generic 500, and Gemini's system prompt
carries `STORE_BLUEPRINT_TOOL_SCHEMA` because the API still will not accept it as
`responseJsonSchema`. Prompt version `2026-08-14.1`.

**Trade-off** 400/403 used to fall through to 500 on purpose (§10: an application bug).
That hid the only fact the operator could act on. They are now a 503 with a readable
message; a leftover 4xx that is not 400/403/404 still becomes 500.

---

## Follow-up — email and password sign-in beside Google

**Prompt** "add login simple and sighnup", run through `/kanalysis`.

**What it produced** The interrogation changed the shape of the task twice before any code:
"login only, no signup" turned out to be unimplementable (the only writer of a `User` row was
the Google upsert, and no seed exists), and the collision branch surfaced pre-emptive
hijacking — register `victim@example.com`, wait for them to arrive via Google, keep the
password. Resolved as: registration never writes onto an existing row (`409`), and a Google
sign-in clears any hash on the row it adopts.

Shipped: `POST /auth/register` (201) and `POST /auth/login` (200) returning the same
`{ accessToken, user }` as `/auth/google`; `PasswordHasherPort` with a `node:crypto` scrypt
adapter (`N=2^15, r=8, p=1`, parameters stored in the hash, `maxmem` raised to 64 MiB because
the default rejects these exact parameters); `ConflictError` → 409 in §10; an Auth.js
`Credentials` provider whose token the `jwt` callback carries; `/signup`, a password form on
`/login`, and one `(auth)/{loading,error}.tsx` pair. Verified against the running API: 201,
then 409 on the duplicate, 200 on sign-in, 401 with one sentence for both a wrong password and
an unknown address at 85ms each, 200 for an uppercased address, and 429 on the sixth attempt.

**Trade-off** Failures come back as `?error=` codes so both pages stay zero-JavaScript Server
Components, which means a rejected form arrives empty and the address has to be retyped. And
rule 2 has a casualty: sign up with a password, then click Continue with Google, and the
password is gone with no reset flow to recover it.

---

## Follow-up — marketing, shell, and builder workspace

**Prompt** Push the code (uncommitted web UI already in the working tree).

**What it produced** Marketing landing split into feature sections with Motion; dashboard
sidebar shell; builder moved to its own route group so editor chrome is not the store list
layout; generation progress, Unsplash imagery helper, section rail and theme presets.

**Trade-off** Adds the `motion` package. Theme presets and colour pickers remain preview-only
on the API side.
