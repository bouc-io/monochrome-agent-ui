# monochrome-agent-ui

React/Vite web UI for **agent-api-server** — converse with the bouc.io agent and
watch its Planner→Executor tool calls stream in real time over SSE.

Part of the [bouc.io AI platform](../../../documentation/getting-started/README.md#ai-assistant-platform).

## Features

- Real-time chat with SSE streaming of run status, plans, tool calls, and results
- Keycloak SSO auth, or `stub` mode for local dev
- Chat history sidebar, light/dark theming
- Built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- A running `agent-api-server` (see its README)
- Ollama or a compatible LLM endpoint

## Setup & Run

```sh
npm install
cp .env.example .env      # then edit values
npm run dev               # dev server at http://localhost:8080
```

## Build & Test

```sh
npm run build             # production build -> dist/
npm run build:dev         # dev-mode build
npm run preview           # preview the production build
npm run lint              # ESLint
npm run test              # Vitest
```

## Environment

All config is via `VITE_*` variables — see [`.env.example`](./.env.example) for the
full list (backend API URL, Keycloak SSO, identity-provider mode, model list, dev tokens).

## Project structure

- `src/pages/` — top-level pages
- `src/components/` — UI components
- `src/context/` — auth / theme / language providers
- `src/hooks/` — custom hooks
- `src/lib/` — API + model utilities

## Quality Gates

```bash
npm run lint          # ESLint (flat config)
npm run lint:fix      # auto-fix what is mechanically fixable
npm run format:check  # prettier, check only
npm run format        # prettier, write
npm test              # vitest, unit tests only
npm run test:ci       # vitest + coverage, writes junit.xml and coverage/
```

CI runs `lint` and `unit-test` from the shared `bouc-io/ci-templates` project.

- **Lint uses a warning ratchet.** ESLint *errors* always fail the build. Warnings are
  capped by `max_warnings` in `.gitlab-ci.yml`, currently **57**. When you
  clean some up, lower the number. Never raise it, and never silence a rule repo-wide to
  get green.
- **Formatting is enforced.** `format:check` gates, using prettier defaults with no config
  file.
- **Two rules are ratchet warnings, not errors**, because shadcn/ui scaffolds them:
  `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-empty-object-type`.
  `no-require-imports` is switched off for root config files, since `tailwind.config.ts`
  loads its plugins with `require()`.

Two things to know before you ever run a bulk reformat here:

- **Prettier needs two passes.** It breaks some method chains across lines on the first
  pass and collapses them back on the second, so a single
  `npm run format` can leave `format:check` failing.
- **Prettier can wrap a statement out from under an `eslint-disable-next-line`.** That is
  why the suppressions in this repo use block `/* eslint-disable rule */ ... /* eslint-enable rule */`
  pairs, which survive re-wrapping. Keep them that way.

## License

[Elastic License 2.0](./LICENSE) — source-available; not OSI open source.
