# Build Plan — Dukkanify AI Store Builder MVP

Source of requirements: `Dukkanify AI Challenge.pdf` (6pp, EN + AR).
Source of structure: [`architecture.md`](./architecture.md) — that file wins on any
structural question. This file only sequences the work and defines the gates.

**Rule for every block below:** it is not done until `npm run typecheck && npm run lint`
pass and the block's own acceptance gate passes. One commit per block, never combined.

---

## Timeline reconciliation

| Source              | Says                                     | Resolution                              |
| ------------------- | ---------------------------------------- | --------------------------------------- |
| Challenge PDF §2    | 4 days maximum, exceeding = disqualified | The ceiling.                            |
| `architecture.md:8` | one-day sprint (~12h)                    | Was written before the PDF was re-read. |

This plan estimates **~18h of focused work across 15 blocks**. Blocks 1–13 are the
scored core; 14–15 are polish and submission. **The cut line is block 12** — if time
collapses, blocks 1–12 still produce a working, demoable, non-disqualifiable submission
(generate → persist → preview), losing only inline editing.

Suggested spread against the 4-day ceiling:

| Day | Blocks | Outcome at end of day                                     |
| --- | ------ | --------------------------------------------------------- |
| 1   | 1–4    | Contracts + database + API skeleton boot, `/health` green |
| 2   | 5–9    | Whole backend done and unit-tested, Swagger browsable     |
| 3   | 10–13  | Landing, auth, dashboard, generate → live preview working |
| 4   | 14–15  | Editor mode, README, prompts log, final verification      |

---

## Requirement → block traceability

| PDF requirement                                                               | Block                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| §4.1 Landing page, Emirati-Arab identity, responsive                          | 11                                           |
| §4.2 Google login + backend session                                           | 5, 12                                        |
| §4.3 Dashboard "Welcome Abdullah" + Create Store                              | 12                                           |
| §4.4 AI prompt interface                                                      | 13                                           |
| §4.5 Generation pipeline (theme, hero, categories, 8 products, About/Contact) | 8                                            |
| §4.6 Instant live preview, no refresh                                         | 13                                           |
| §4.7 Dynamic editor mode, inline edit                                         | 14                                           |
| §4.8 Persistence to PostgreSQL                                                | 3, 7                                         |
| §4.9 REST + Prisma schema + Clean Architecture                                | 4, 6, 7, 8                                   |
| §5 Clean repo, atomic commits, README                                         | every block, 15                              |
| §6 Bonus (streaming, Server Actions, realtime, undo/redo, versions)           | 13 (Server Actions), rest declared cut in 15 |

Rubric weight (100pt) drives effort allocation: Architecture 20, Clean code 15,
AI integration 15, Next 10, Nest 10, UI/UX 10, then 5 each for performance, security,
git history, docs.

---

## Block 0 — where the repo already is (done, uncommitted)

npm workspaces monorepo; `apps/api` (NestJS 11) and `apps/web` (Next 15.5 + Tailwind v4

- shadcn/Base UI, 16 components, RTL flag on); husky + commitlint + lint-staged wired;
  `.env.example` files committable, real env files blocked; `typecheck`/`lint`/per-app
  `build` green; Prisma 7.9.1 initialised.

Not yet present: `packages/` is empty, `.github/workflows/` is empty, no `README.md`,
no `docs/prompts.md`, Postgres container unverified (docker socket permission).

**This entire state is still uncommitted.** Block 1 is what lands it.

---

## Block 1 — Workspace foundation and CI

**Goal** Land the scaffold, add the one shared config package the spec names, prove the
database is reachable.

**Do**

- `packages/tsconfig/base.json` — strict base both apps extend (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`). Point both `tsconfig.json` files at it.
- `.github/workflows/ci.yml` — one job: install, typecheck, lint, build, the §3 dependency-rule grep.
- Fix `apps/src/main.ts` floating-promise lint warning (`void bootstrap()`).
- Verify `docker compose up -d` and `pg_isready`. Requires `sudo usermod -aG docker $USER` + re-login first.

**Gate** `npm run typecheck && npm run lint && npm run build -w api && npm run build -w web` green; `docker compose ps` shows postgres healthy; CI file parses.

**Commit** `chore(repo): scaffold npm workspaces, tooling and CI`

**Est** 1h · **Risk** low, except the docker group change needs a re-login.

---

## Block 2 — `packages/contracts`

The highest-leverage block in the build. Everything downstream types against it.

**Goal** One Zod definition serving three jobs: the model's tool `input_schema`, the API
validator, and the React prop types.

**Do**

- `src/enums.ts` — `StoreStatus`, `Direction`, `PageType`, `SectionType` (mirrors of the Prisma enums; changing one changes both in the same commit, per CLAUDE.md).
- `src/theme.schema.ts` — `ThemeTokens`: colors (hex-validated), fonts, radius, spacing scale.
- `src/section.schema.ts` — `SectionContent` as a **discriminated union on `type`**: `HERO`, `CATEGORY_GRID`, `PRODUCT_GRID`, `RICH_TEXT`, `CONTACT`.
- `src/blueprint.schema.ts` — `StoreBlueprintSchema`: store meta, theme, categories, **exactly 8 products** (`.length(8)`), pages with sections. Cross-field refinement: every `product.categorySlug` must exist in `categories`.
- `src/dto.ts` — `StoreDto`, `StoreSummaryDto`, `SectionDto`, `GenerateRequest`, `AuthResponse`.
- `src/json-schema.ts` — `zod-to-json-schema` export for the Anthropic tool definition.
- Vitest: valid fixture passes; 7 products rejected; bad hex rejected; orphan category rejected.
- Build to `dist`, exported via `main`/`types`, consumed as `@dukkanify/contracts` by both apps.

**Gate** `npm run test -w @dukkanify/contracts` green; `import { StoreBlueprintSchema } from '@dukkanify/contracts'` resolves in both apps under typecheck.

**Commit** `feat(contracts): add zod blueprint, theme and section schemas`

**Est** 2h · **Risk** the `.length(8)` and category-ref refinement are what make the AI
boundary safe — get them right here or repair logic in block 8 has nothing to check against.

---

## Block 3 — Prisma schema, migration, Prisma 7 spec alignment

**Goal** The data model from `architecture.md` §6 in the database, and the spec updated
to Prisma 7 reality.

**Do**

- Write `schema.prisma`: `User`, `Store`, `Page`, `Section`, `Category`, `Product`, `StoreVersion` + 4 enums, exactly as §6 — `Decimal @db.Decimal(10,2)`, `locale`/`direction` columns from migration one, `promptVersion` on `Store`, all indexes and `onDelete` rules.
- Set generator output to `../src/generated/prisma`; add `src/generated` to `apps/api/.gitignore`; add `"postinstall": "prisma generate"` to `apps/api/package.json`.
- **Update `architecture.md` §6** (lines 220–222): generator becomes `provider = "prisma-client"` with that output, plus notes that the datasource URL now lives in `prisma.config.ts` and the client is imported from the generated path, not `@prisma/client`.
- `prisma migrate dev --name init`; commit the migration SQL.
- `infrastructure/prisma/{prisma.module.ts,prisma.service.ts}` — `OnModuleInit` connect, `enableShutdownHooks`.

**Gate** `prisma migrate dev` applies clean against the container; `prisma generate`
produces the client; `psql -c '\dt'` lists 7 tables.

**Commit** `feat(api): add prisma schema, initial migration and prisma module`

**Est** 1.5h · **Risk** Prisma 7's `prisma.config.ts` needs `dotenv`, already a declared
dep. Decimal ↔ TypeScript mapping bites at the mapper boundary, not here.

---

## Block 4 — API skeleton: config, errors, filter, interceptors, health

**Goal** Every cross-cutting concern in place _before_ any feature, so no feature invents
its own.

**Do**

- `config/env.validation.ts` — Zod over `process.env`, read in exactly one file, fails boot with a readable list. `config/configuration.ts` exposes a typed `AppConfig`.
- `common/errors/` — `DomainError` base + `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `BlueprintGenerationFailedError`, `AiProviderUnavailableError`.
- `common/filters/all-exceptions.filter.ts` — the **single** place `DomainError` → HTTP mapping happens, exactly the §10 table. No stack traces in production; `requestId` on every error.
- `common/interceptors/` — `transform` wraps every response as `{ data, meta }`; `logging` records method, path, duration.
- `common/decorators/` — `@CurrentUser()`, `@Public()`.
- `main.ts` — helmet, compression, CORS from config, `/api/v1` URI versioning, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), global filter + interceptors, Swagger at `/api/docs` when not production, `ThrottlerModule` from config.
- `GET /api/v1/health` — liveness + `SELECT 1` database check.

**Gate** API boots; `/api/v1/health` returns `{ data: { status: 'ok', database: 'up' } }`;
deleting a required env var fails boot with a named list, not a stack trace; `/api/docs` renders.

**Commit** `feat(api): add config validation, error model, filters and health check`

**Est** 2h · **Risk** low. Pays for itself in blocks 5–8 and covers the rubric's Security
& Data Validation 5pt outright.

---

## Block 5 — Auth module

**Goal** Google `id_token` verified **server-side**, exchanged for an application JWT.

**Do**

- `infrastructure/google-token.verifier.ts` — `google-auth-library`, `verifyIdToken` against `GOOGLE_CLIENT_ID` as audience.
- `infrastructure/jwt.strategy.ts`, `jwt-auth.guard.ts` — global guard, `@Public()` opts out.
- `application/auth.service.ts` — verify, upsert `User` by `googleId` then `email`, sign a 7d JWT.
- `presentation/auth.controller.ts` — `POST /api/v1/auth/google`, public, under 40 lines, returns `AuthResponse` DTO. Never returns a Prisma model.

**Gate** A forged/expired `idToken` returns 401 through the filter, not a 500. A valid one
returns `{ accessToken, user }` and creates exactly one `User` row on repeat calls.
`GET /api/v1/store` without a bearer token returns 401.

**Commit** `feat(api): add google auth with server-side token verification`

**Est** 1.5h · **Risk** testing needs a real Google client ID; a unit test with the
verifier mocked is the fast path, manual browser check in block 12 is the proof.

**Note** `auth/` has **no `domain/` folder** — deliberate, per `architecture.md:129`. Be
ready to defend that in the live round.

---

## Block 6 — Stores domain layer

**Goal** The layer that must import nothing. This is the 20-point block.

**Do**

- `domain/entities/{store,page,section,product}.entity.ts` — plain classes, invariants enforced in the constructor or a static factory (slug shape, non-empty title, positive price, page count).
- `domain/value-objects/slug.vo.ts` — normalise + validate; `money.vo.ts` — Decimal-backed, never `number`.
- `domain/ports/store.repository.port.ts` — the interface plus the `STORE_REPOSITORY` injection token.

**Gate** The §3 grep returns **zero hits**:

```bash
grep -rn "PrismaService\|@prisma/client\|@anthropic-ai/sdk\|@nestjs/" \
  apps/api/src/modules/*/domain
```

Vitest covers each invariant, with no framework imported in the test file.

**Commit** `feat(api): add stores domain entities, value objects and repository port`

**Est** 1.5h · **Risk** the temptation to import Prisma's `Decimal` into the domain.
Use `decimal.js` (Prisma's own dependency) or a hand-rolled minor-units integer — decide
once, here, and write the reason in the file.

---

## Block 7 — Stores application + infrastructure + presentation

**Goal** Persist and read stores, with ownership enforced where it cannot be bypassed.

**Do**

- `infrastructure/prisma-store.repository.ts` — implements the port; `save` is **one transaction** across store → pages → sections → categories → products; every query scoped by `ownerId`.
- `application/mappers/store.mapper.ts` — Prisma model → domain → DTO. Decimal → string at this boundary, never a float.
- `application/use-cases/` — `get-store`, `list-stores`, `save-store`, `update-section`. Each a single public `execute(input): Promise<Output>`. **Ownership checked inside the use case**, throwing `ForbiddenError`.
- `presentation/stores.controller.ts` — `POST /store`, `GET /store`, `GET /store/:id`, `PATCH /store/:id/sections/:sectionId`, `GET /storefront/:slug` (public). Thin, under 40 lines.

**Gate** Full round-trip via curl: save a store, list it, fetch it by id, patch one
section. Requesting another user's store id returns **403, not 404-by-accident**. No
endpoint returns a Prisma shape (`price` is a string, no `createdAt` leakage where the
DTO doesn't declare it).

**Commit** `feat(api): add stores use cases, prisma repository and controller`

**Est** 2.5h · **Risk** the transactional nested write is the fiddliest code in the
backend. Write it against the real container early.

---

## Block 8 — Generation module

**Goal** The 15-point block. Prompt → validated blueprint → persisted store.

**Do**

- `domain/ports/ai-generator.port.ts` — interface + `AI_GENERATOR` token. Domain-owned, SDK-free.
- `infrastructure/prompts/` — `system.prompt.ts`, `user.prompt.ts`, `prompt.version.ts`. System prompt carries the Emirati-Arab design direction and the hard output contract (8 products, 3 pages, category slugs must match).
- `infrastructure/providers/mock.generator.ts` — deterministic, keyword-driven (perfume/oud/gift/bukhoor), returns a schema-valid blueprint. Ships as a first-class adapter, not a stub.
- `infrastructure/providers/claude.generator.ts` — Anthropic SDK, **tool-use with the `zod-to-json-schema` output from block 2** as `input_schema`, `claude-sonnet-5`, 60s `AbortController`. Logs latency, token counts, `PROMPT_VERSION`. Never logs the key or the full prompt body.
- `generation.module.ts` — `useFactory` binds mock or claude off `AI_PROVIDER`. No conditional imports.
- `application/services/blueprint-repair.service.ts` — on `safeParse` failure, **one repair turn** feeding back the exact Zod issues. Two attempts total, then `BlueprintGenerationFailedError` → 422.
- `application/use-cases/generate-store.use-case.ts` — guard prompt ≤500 chars and strip control characters; call the port; validate; repair; then **deterministic normalisation** (slugify, dedupe SKUs, clamp prices to 2dp, repair category refs); save via `StoreRepositoryPort` in one transaction.
- `presentation/generation.controller.ts` — `POST /api/v1/generate`, throttled 5/min/user, returns 201 + `StoreDto`.

**Gate** With `AI_PROVIDER=mock`, `POST /generate` persists a complete store and the
response validates against `StoreDto`. A provider stubbed to return malformed JSON
produces **422 with an actionable message, never 500**. A provider stubbed to time out
produces 503. `AI_PROVIDER=claude` works once against the real API — then back to mock
for the rest of the build.

**Commit** `feat(api): add ai generation pipeline with mock and claude providers`

**Est** 3h · **Risk** the single biggest block. Build and demo it entirely on the mock
provider; spend real tokens only on the one end-to-end confirmation.

---

## Block 9 — Backend test suite

**Goal** The §13 table, exactly — narrow and high-signal, not coverage theatre.

**Do** Vitest across four layers: contracts (block 2's tests already there), domain
invariants, `GenerateStoreUseCase` against `MockGenerator` + an **in-memory repository
fake**, and the Claude adapter with the SDK mocked (happy path, malformed JSON, schema
violation, network error).

**Gate** `npm run test -w api` green with **no database and no network**. That it runs
with zero infrastructure is the payoff of block 6 — say so in the README.

**Commit** `test(api): add unit tests for contracts, domain, use cases and adapters`

**Est** 1.5h · **Risk** low. Cheap insurance for the live-coding round.

---

## Block 10 — Web foundation and design system

**Goal** The Emirati-Arab visual identity as tokens, before any page exists.

**Do**

- `globals.css` — palette from desert sand, deep oud brown, gold leaf. **Not** SaaS purple/indigo. Tailwind v4 `@theme` tokens.
- `next/font` — IBM Plex Sans Arabic for display, a restrained Latin serif for headings.
- `app/layout.tsx` — `lang`/`dir` attributes, font variables, `<Toaster />`.
- One mashrabiya motif as a single reusable SVG component, used **once** on the landing hero.
- `lib/api-client.ts` — typed fetch wrapper, bearer token from session, unwraps `{ data, meta }`, maps error status → typed error.
- `lib/auth.ts` — Auth.js v5 config, Google provider, `jwt` callback storing the API `accessToken` from block 5.
- `loading.tsx` + `error.tsx` for every route group.
- **Logical CSS spacing only** (`ms`/`me`/`ps`/`pe`/`start`/`end`) from the first line written.

**Gate** `npm run build -w web` green. Flipping `dir="rtl"` on `<html>` produces a
correctly mirrored layout with **no** CSS changes. Grep finds zero `ml-`/`mr-`/`pl-`/`pr-`.

**Commit** `feat(web): add design tokens, fonts, api client and auth config`

**Est** 2h · **Risk** the RTL grep discipline is trivial now and expensive to retrofit.
It's also a likely live-coding task — `architecture.md:494` bets on it.

---

## Block 11 — Landing page

**Goal** PDF §4.1: high-converting, professional, Emirati identity, responsive.

**Do** `app/(marketing)/page.tsx` as a **Server Component** — hero with the motif and a
clear primary CTA, a three-step "how it works", a sample-storefront strip, footer.
Generous whitespace. Mobile-first, verified at 375 / 768 / 1440.

**Gate** Renders as a Server Component with **zero** `"use client"` in the tree. Lighthouse
mobile ≥ 90 on performance and accessibility. No horizontal scroll at 375px.

**Commit** `feat(web): add marketing landing page`

**Est** 1.5h · **Risk** the 10 UI/UX points and the whole first impression ride on this
page. It is also the easiest place to look generic — hold the palette.

---

## Block 12 — Login and dashboard

**Goal** PDF §4.2 + §4.3.

**Do**

- `app/(auth)/login/page.tsx` — Google sign-in button, one clear failure state.
- `app/api/auth/[...nextauth]/route.ts` — Auth.js handler; the `jwt` callback POSTs the Google `id_token` to `/api/v1/auth/google` and stores the returned application JWT on the session.
- `app/(dashboard)/layout.tsx` — session guard (redirect unauthenticated to `/login`), shell with user avatar.
- `app/(dashboard)/dashboard/page.tsx` — **"Welcome {firstName}"**, prominent **"Create Store"** CTA, grid of the user's existing stores from `GET /store`, and a genuine empty state.

**Gate** Real Google login end to end; `/dashboard` unauthenticated redirects to `/login`;
the dashboard's store list comes from the API with a bearer token, never from a direct
database read. **No `useEffect` fetching anywhere.**

**Commit** `feat(web): add google login, session guard and dashboard`

**Est** 2h · **Risk** Auth.js v5 beta + the token-exchange callback is the fiddliest
frontend wiring. Needs Google Cloud OAuth credentials with
`http://localhost:3000/api/auth/callback/google` registered — **set this up before the block starts.**

---

## Block 13 — Prompt interface, generation, live preview

**Goal** PDF §4.4 + §4.5 + §4.6, and the Server Actions bonus.

**Do**

- `features/generation/prompt-composer.tsx` — `"use client"` leaf: textarea, 500-char counter, example-prompt chips ("Create a luxury perfume store for UAE customers"), pending state via `useActionState`.
- `features/generation/actions.ts` — **Server Action** calling `POST /generate`, then `revalidateTag` + `redirect` to the builder. No client-side API key, no `useEffect`.
- `features/storefront/sections/*.section.tsx` — the five section components, styled **only** with `var(--brand-*)`.
- `features/storefront/section-renderer.tsx` — the registry with the `never` exhaustiveness check from `architecture.md:191`.
- `app/preview/[slug]/page.tsx` — public storefront, server-rendered from `GET /storefront/:slug`.
- `app/(dashboard)/builder/[storeId]/page.tsx` — theme tokens applied as CSS custom properties on a wrapper; the same section components render inside the builder. **One set of components, two contexts.**

**Gate** Prompt → Generate → the generated storefront appears **without a browser
refresh**. Removing a registry entry is a **compile error**, not a blank section. Adding a
`SectionType` to contracts breaks the build until a component exists.

**Commit** `feat(web): add prompt composer, generation action and storefront renderer`

**Est** 2.5h · **Risk** highest-visibility block — this is the demo. The registry's
`never` check is what the live round will poke at.

---

## Block 14 — Editor mode

**Goal** PDF §4.7: granular inline editing of titles, colors, text.

**Do**

- `features/builder/builder-store.ts` — zustand: local section drafts + dirty flags.
- `features/builder/editor-panel.tsx` — `"use client"`: text fields bound to the selected section, color pickers writing straight to the `--brand-*` custom properties (live, no re-render, no recompile — `architecture.md:488`).
- Save via a Server Action → `PATCH /store/:id/sections/:sectionId`, optimistic update with rollback on failure and a `sonner` toast.
- Click-to-select on a rendered section scrolls the panel to its fields.

**Gate** Editing a hero headline persists and survives a hard reload. Changing the primary
color updates every section instantly. A rejected PATCH rolls the UI back and toasts.

**Commit** `feat(web): add inline editor panel with optimistic section updates`

**Est** 2h · **Risk** the cut-line block. If time runs out, ship read-only preview and
declare editing in Known limitations — an honest gap beats a broken editor.

---

## Block 15 — Documentation and submission

**Goal** PDF §5 and the 5 documentation points; close every disqualification condition.

**Do**

- `README.md` generated from `architecture.md`: what it is, screenshots, prerequisites, `.env` setup, `docker compose up -d`, migrate, run both apps, the architecture diagrams (mermaid), the API table, AI tool integration notes, and **Known limitations verbatim from §14**.
- `docs/prompts.md` — the prompt log CLAUDE.md requires: every prompt used, what it produced, what was changed afterwards. This is the PDF's mandatory prompt-engineering documentation.
- Update `architecture.md` §14 so the limitations list is true at submission (streaming, undo/redo, version-history writer, Gemini adapter, e2e tests).
- Final sweep against PDF §8: zero `.js` source files, zero `any`, zero `@ts-ignore`, no template-copied code, no duplication.
- Rehearse the live round: architectural defence, the AI tool workflow, §15 scaling, §16 roadmap, and a dry run of "add a testimonials section" against the registry.

**Gate** `npm run typecheck && npm run lint && npm run build && npm run test` all green
from a clean clone. `git log --oneline` reads as 15 atomic conventional commits. A
stranger can go from clone to a generated store using only the README.

**Commit** `docs(repo): add readme, prompt log and updated limitations`

**Est** 1.5h · **Risk** low, and it is worth 5 rubric points plus the removal of two
disqualification conditions. Do not let it be the block that gets squeezed.

---

## Standing gates (every block, no exceptions)

1. `npm run typecheck` — zero errors. No `any`, no `@ts-ignore`, no `as unknown as`.
2. `npm run lint` — zero errors.
3. The §3 dependency grep — zero hits in `domain/` and `application/`.
4. RTL grep — zero physical spacing utilities in `apps/web/src`.
5. `git add` names files explicitly. Never `-A`. Never `git push`.
6. Commit message verbatim as given; if commitlint rejects it, fix the format, never `--no-verify`.
7. Append to `docs/prompts.md` after committing.

## Declared out of scope

Streaming (SSE), realtime updates, undo/redo, version-history writer, Gemini adapter,
image generation, HTTP e2e tests, repository integration tests. All are listed in
`architecture.md` §14 with the reason. **`StoreVersion` exists in the schema with no
producer — say that out loud rather than letting a reviewer find it.**
