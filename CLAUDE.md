# Dukkanify AI Store Builder — Engineering Rules

## Product

A user writes a natural-language prompt ("Create a luxury perfume store for UAE
customers") and we generate a complete storefront: theme tokens, hero, categories,
8 products, About/Contact pages. Persisted to PostgreSQL, live-previewed, inline-editable.

## Constraints of this build

One-day sprint. Prefer the smallest correct implementation. Do not add features,
abstractions, files or dependencies I did not ask for. If you think something extra
is needed, say so in one line and wait — do not build it.

## Non-negotiables

- TypeScript strict everywhere. `any` is banned. No `.js` source files.
- No `@ts-ignore`, no `as unknown as`, no non-null `!` without a justifying comment.
- Every external input validated with Zod / class-validator at the boundary.
- No secrets in apps/web. The Anthropic key exists only in apps/api.

## Backend (NestJS, apps/api)

- Clean architecture per module: domain / application / infrastructure / presentation.
- Dependency rule: presentation → application → domain; infrastructure → domain.
  domain/ imports NOTHING from @nestjs/* or @prisma/client. This is checked by grep.
- Use cases are single-public-method classes: execute(input): Promise<Output>.
- Repositories and the AI provider are interfaces (*.port.ts) in domain, implemented
  in infrastructure, bound with injection tokens. Never inject PrismaService or the
  Anthropic SDK into a use case.
- Controllers are thin: validate, call use case, map to DTO. Under 40 lines.
- Never return a Prisma model from a controller — map it.
- Money is Decimal, never number.
- Prisma enums and packages/contracts enums are duplicated by necessity. If you change
  one, change the other in the same commit and say so.

## Frontend (Next.js 15, apps/web)

- Server Components by default. "use client" only on leaf interactive components.
- Mutations via Server Actions. No useEffect for data fetching.
- Feature-first folders under src/features/*. src/components/ui is shadcn only.
- Every route has loading.tsx and error.tsx.
- Logical CSS spacing only (ms/me/ps/pe/start/end), never ml/pl — RTL must work free.

## Shared

- packages/contracts holds Zod schemas + inferred types, built to dist.
  A type used by both apps lives there and is never duplicated.

## Design language

Emirati-Arab premium commerce. Palette from desert sand, deep oud brown and gold leaf
— not generic SaaS purple/indigo. Arabic-capable display face (IBM Plex Sans Arabic or
Noto Kufi Arabic) paired with a restrained Latin serif. Generous whitespace, one
geometric mashrabiya motif used once, not everywhere.

## Definition of done

`npm run typecheck && npm run lint && npm run build` pass, and the diff contains no
file the task didn't require.

## Commits — you make them

- Commit at the end of every block, only after typecheck and lint both pass.
- I give you the exact commit messages. Use them verbatim, in the order listed.
- One logical change per commit. Never combine blocks into a single commit.
- Never `git add -A`. Stage only files this task created or modified.
- No Co-Authored-By line, no "Generated with" line, no emoji in commit messages.
- If commitlint rejects a message, fix the format — do not bypass the hook.
- Never run `git push`. I handle pushes.
- After committing, append to docs/prompts.md: the prompt, what it produced, any trade-off.

## Specification

docs/architecture.md is the source of truth for structure, data model, error mapping
and API surface. Read it before any task. If your implementation would contradict it,
stop and tell me — do not silently deviate.
