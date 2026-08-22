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

## License

[Elastic License 2.0](./LICENSE) — source-available; not OSI open source.
