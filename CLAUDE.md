# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build (Turbopack); also runs the TypeScript check and generates route types
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

- `npm run test` — Vitest, single run (`vitest.config.mts`: jsdom, native tsconfig `@/*` resolution, jest-dom matchers via `vitest.setup.ts`)
- `npm run test:watch` — Vitest in watch mode
- `npx vitest run <path>` — run a single test file; `npx vitest run -t "<name>"` to filter by test name

Tests are co-located next to the file under test (`*.test.ts(x)`).

## Project rules: `docs/SETUP.md`

`docs/SETUP.md` is the source of truth for how code is written here. Read it before creating or moving files:

- **§1 Folder structure** — domain code lives in `src/modules/<domain>/` (`components/`, `hooks/`, `services/`, `schemas/`, `store/`, `types/`); `src/app/` only holds route files that compose from modules; cross-domain code goes in `src/components/`, `src/hooks/`, `src/lib/`. English names, `kebab-case` files, layer suffixes (`*.service.ts`, `*.schema.ts`, `*.store.ts`, `*.types.ts`, `use-*.ts`).
- **§2 Best practices** — SOLID, DRY, KISS, YAGNI. Before creating any component, hook, service or util, search `src/` for an existing one, and for UI check shadcn first (`npx shadcn@latest search @shadcn -q "<term>"`).
- **§3 Methodology** — Spec Driven Development + Vitest unit tests for services, hooks with logic, stores, schemas and `src/lib/` utils.

## SDD agents (`.claude/agents/`)

| Agent | Role |
|---|---|
| `orchestrator` | Entry point. Triage: **build mode** (≤3 files, one layer, unambiguous, no new shared contracts) vs **SDD** (anything else; when in doubt, SDD). Keeps plans achievable (≤~6 tasks, ≤~5 files each, otherwise phases), runs the approval gate, dispatches parallel groups, runs the review loop (max 3 rounds). |
| `spec` | Writes `docs/specs/<domain>/<feature>.md` in `draft`: acceptance criteria (`AC-n`), contracts, reuse inventory, task plan (`T-n`) with assigned files and parallel groups. Never approves its own spec. |
| `developer` | Implements one task, touching only its assigned files. Refuses to start an SDD task unless the spec is `approved`. No installs, no `npm run build`, no git state changes while running in parallel. |
| `reviewer` | Read-only. Validates against the spec's ACs and `docs/SETUP.md`, checks for duplication, runs lint/test/build. Returns `APPROVED` or `CHANGES_REQUESTED` (`BLOCKER` / `MINOR` / `SPEC_ISSUE`). |

- **Human approval is blocking**: no `developer` runs on an SDD task until a human explicitly approves the spec (`Estado: approved`, `Aprobado por` filled in). Any later spec change sends it back to `draft`.
- **Parallelism**: Group 0 (installs, `shadcn add`, `layout.tsx`, `globals.css`, shared contracts) runs serially first; tasks inside later groups have disjoint file sets and are launched together.
- Run `claude --agent orchestrator` — subagents can't spawn subagents, so the orchestrator must be the main thread to dispatch the others.

## Architecture

Next.js 16 App Router project (`src/app`) with TypeScript, Tailwind CSS v4, and shadcn/ui. Import alias `@/*` maps to `src/*` (`tsconfig.json`).

**Read `AGENTS.md` before touching Next.js APIs** — this Next.js version postdates the training data of most models and has breaking changes vs. what you'd expect; the actual docs are vendored in `node_modules/next/dist/docs/`.

- **Providers**: client-only providers live under `src/components/providers/` and are composed into `src/app/layout.tsx` (the root layout, a server component). `QueryProvider` (`src/components/providers/query-provider.tsx`) wraps the app in a `QueryClientProvider`, creating the `QueryClient` with `useState` so it isn't recreated on re-render and isn't shared across requests during SSR. Add new app-wide client context providers here, not directly in `layout.tsx`.
- **UI components**: shadcn/ui components live in `src/components/ui/` and are generated via the CLI (`npx shadcn@latest add <component>`), not hand-written from scratch. Config is in `components.json`: style `base-nova`, base color `neutral`, CSS variables enabled, icon library `lucide`. Aliases: `components` → `@/components`, `ui` → `@/components/ui`, `lib` → `@/lib`, `hooks` → `@/hooks`.
- **Utilities**: `src/lib/utils.ts` holds the shadcn-generated `cn()` class-merge helper.
- **Route typing**: the root layout uses the generated `LayoutProps<"/">` type (from `.next/types`), part of Next's typed-routes output produced during `dev`/`build` — page/layout prop types should be pulled from these generated types rather than hand-written.

### Installed but not yet wired up

These libraries are dependencies but have no established usage pattern in the codebase yet — the first usage sets the convention:

- `axios` — HTTP client
- `@tanstack/react-query` — provider is set up (see above); no queries/mutations exist yet
- `@tanstack/react-table` — headless table logic
- `zod` — schema validation
- `zustand` — client state stores
