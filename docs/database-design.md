# Database Design

The initial Prisma schema is implemented in `backend/prisma/schema.prisma`. Migration `20261104133950_init_database` has been reviewed and applied to the empty development `alaala` database on MySQL port `3307`.

## To document

- Entity relationships and lifecycle rules.
- Immutable content and hash-chain fields.
- Policy versioning, frozen policies, and release dates.
- Audit and AI source-reference retention.
- Indexes, constraints, and migration review procedure.

Development data is created by `npm --workspace backend run db:seed` and uses fictional identities and diary content only.
