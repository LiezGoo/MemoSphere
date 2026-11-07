# Security Design

Document threats, trust boundaries, secret handling, privacy controls, default-deny rules, auditability, tamper detection, and incident response assumptions.

Authentication uses bcrypt password hashes and opaque random session tokens. Only SHA-256 token hashes are persisted in `AuthSession`; the raw token exists only in the HTTP-only `alaala_session` cookie. Logout deletes the server-side session. Login and registration are rate-limited, credential failures are generic, and mutating auth requests enforce a configured frontend origin.

The initial Prisma schema change requires review against the target MySQL database before generating and applying a migration. No migration is applied automatically.
