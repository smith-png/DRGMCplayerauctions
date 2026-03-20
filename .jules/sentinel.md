## 2024-05-18 - Prevent Error Detail Leakage in API Responses
**Vulnerability:** The API endpoints (`startAuction`, `placeBid`, and `markPlayerUnsold`) returned raw `error.message` details in the `500 Internal Server Error` responses.
**Learning:** Returning `error.message` directly from catch blocks exposes internal system details to the frontend, which could provide useful context to an attacker.
**Prevention:** Fail securely by returning generic error messages to the frontend. Log detailed errors on the backend using `console.error` for debugging instead.