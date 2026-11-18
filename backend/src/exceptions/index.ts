export class AppError extends Error {
	constructor(public readonly statusCode: number, message: string, public readonly code: string) {
		super(message);
		this.name = new.target.name;
	}
}

export class AccessDenied extends AppError { constructor(message = 'Access denied.') { super(403, message, 'ACCESS_DENIED'); } }
export class AmbiguousName extends Error {}
export class TamperDetected extends Error {}
export class PolicySyntaxError extends Error {}
export class EntryNotFound extends AppError { constructor(message = 'Diary entry not found.') { super(404, message, 'ENTRY_NOT_FOUND'); } }
export class ResourceNotFound extends AppError { constructor(message = 'Resource not found.') { super(404, message, 'NOT_FOUND'); } }
export class InvalidPolicyState extends Error {}
export class RequestValidationError extends AppError { constructor(message: string) { super(400, message, 'VALIDATION_ERROR'); } }
export class InputValidationError extends AppError { constructor(message: string) { super(422, message, 'VALIDATION_ERROR'); } }
export class UnsupportedMediaTypeError extends AppError { constructor(message: string) { super(415, message, 'UNSUPPORTED_MEDIA_TYPE'); } }
export class RequestEntityTooLarge extends AppError { constructor(message = 'The uploaded file is too large.') { super(413, message, 'PAYLOAD_TOO_LARGE'); } }
export class ConflictError extends AppError { constructor(message: string) { super(409, message, 'CONFLICT'); } }
export class UnauthorizedError extends AppError { constructor(message = 'Incorrect email or password.') { super(401, message, 'UNAUTHORIZED'); } }
export class AccountLockedError extends AppError { constructor(message = 'This account is currently locked.') { super(423, message, 'ACCOUNT_LOCKED'); } }
export class RateLimitError extends AppError { constructor() { super(429, 'Too many requests. Try again later.', 'RATE_LIMITED'); } }
export class ServiceUnavailableError extends AppError { constructor(message: string) { super(503, message, 'SERVICE_UNAVAILABLE'); } }
export class ProviderFailureError extends AppError { constructor(message: string) { super(502, message, 'PROVIDER_FAILURE'); } }
