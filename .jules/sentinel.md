## 2024-05-24 - Information Leakage in API Responses
**Vulnerability:** Leaking stack traces or detailed error messages to the client on 500 errors.
**Learning:** Returning `error.message` directly in a JSON response for a 500 server error leaks internal implementation details (e.g. database structure, query errors) to end users.
**Prevention:** Always log the detailed error internally using `console.error` (or a proper logger) for debugging, but return generic error messages like "Internal server error" or "Failed to perform action" to the client.