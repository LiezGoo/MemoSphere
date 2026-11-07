# API Documentation

Document endpoint contracts, authentication, validation errors, authorization requirements, pagination, and examples using fictional data.

## Authentication

The backend exposes these endpoints under `/api/auth`:

### `POST /api/auth/register`

Request:

```json
{
	"fullName": "Sample User",
	"email": "sample@example.test",
	"password": "CorrectPassword1",
	"confirmPassword": "CorrectPassword1"
}
```

Returns `201` with a safe user profile. The password and hash are never returned.

### `POST /api/auth/login`

Accepts `email` and `password`, then sets the `alaala_session` HTTP-only cookie. Invalid credentials return the same generic `401` response regardless of whether the email exists.

### `POST /api/auth/logout`

Revokes the current server-side session and clears the cookie. This endpoint is safe to call without an active session.

### `GET /api/auth/me`

Requires the session cookie and returns the authenticated user's safe profile. Unauthenticated requests receive `401`.

The browser client must send credentials and use the public `NEXT_PUBLIC_API_BASE_URL`. Backend secrets must never use a `NEXT_PUBLIC_` variable.
