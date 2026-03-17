## 2025-03-17 - Stop returning raw error messages
**Vulnerability:** Raw `error.message` was being returned to the frontend in multiple controller functions (auctionController.js, testgroundsController.js).
**Learning:** Returning `error.message` or `error.stack` exposes sensitive backend implementation details and stack trace information to the client, which could aid attackers.
**Prevention:** Fail securely. Catch and log detailed errors on the backend using `console.error` or a logger, but only return generic error messages (e.g., 'Internal server error', 'Failed to perform action') to the frontend.
