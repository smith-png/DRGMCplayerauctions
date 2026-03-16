## 2024-05-20 - [MEDIUM] Error Details Exfiltration in Controllers
**Vulnerability:** Controller responses were leaking raw database error messages (`error.message`) in JSON responses to the client upon catching an exception.
**Learning:** Returning detailed error messages to users is a security risk as it can expose internal database structure or implementation details (information disclosure), potentially aiding an attacker.
**Prevention:** Catch blocks in controllers should only log the error internally using `console.error` for debugging, and return a generic error message (e.g., "Internal server error" or "Failed to perform action") in the client-facing HTTP response.
