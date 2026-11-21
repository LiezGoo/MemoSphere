# Alaala: My Personal AI Diary

## Repository layout

- `frontend/`: Next.js App Router user interface.
- `backend/`: Express and TypeScript application boundary.
- `database/`: Database notes and review material.
- `docs/`: Architecture, language, security, and development documentation.
- `tests/`: Unit, integration, security, and end-to-end test organization.
- `scripts/`: Repository maintenance scripts.

The foundation deliberately contains no diary business logic, real personal data, production credentials, or applied database migrations.

## Prerequisites

- Node.js 24 LTS-compatible runtime
- npm 11+
- MySQL 8.0 for database-backed development
- SWI-Prolog for future authorization engine work

## Setup

1. Copy `.env.example` to a local `.env` and replace development-only values.
2. Run `npm install` from the repository root.
3. Run `npm run dev:frontend` and `npm run dev:backend` in separate terminals.
4. Review `docs/database-design.md` and `backend/prisma/schema.prisma` before creating future migrations.

The backend requires a configured `DATABASE_URL` before it starts. Authentication endpoints are documented in `docs/api-documentation.md`. The initial database migration is already applied; use `npm --workspace backend run db:seed` for fictional development data and `npm --workspace backend run db:verify` for a non-destructive CRUD check.

## Commands

- `npm run dev:frontend`: start Next.js on port 3000.
- `npm run dev:backend`: start the backend on port 4000.
- `npm run typecheck`: type-check both applications.
- `npm run test`: run the configured test suites.
- `npm run format`: format supported source files.

## Security boundary

AI orchestration must use authorized backend retrieval tools. It must never receive direct database access or bypass authorization. See `SECURITY.md` and `docs/ai-design.md`.

## Transactional email

The backend uses Resend over HTTPS by default. Set `RESEND_API_KEY` and `MAIL_FROM` to a sender on a verified Resend domain; keep both server-side (local backend `.env` and Render environment only). `MAIL_PROVIDER` accepts `resend` (default), `brevo` for the retained compatibility provider, or `log`. `MAIL_MODE=log` keeps delivery disabled and logs a sanitized message. Do not put diary entries or other diary content in transactional email payloads.

The free Resend plan's daily sending limit is 100 emails. The outbox worker prioritizes release notices, invitations, then owner warnings, pauses pending work at the daily limit, and uses the outbox idempotency key for retries.
