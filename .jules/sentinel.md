## 2024-05-24 - Do Not Leak Raw Error Messages

**Vulnerability:** Found `details: error.message` being sent in HTTP 500 responses within `backend/src/controllers/testgroundsController.js` and `backend/src/controllers/auctionController.js`.
**Learning:** Sending raw database or internal error messages to the frontend can leak sensitive information about the backend infrastructure and schema, leading to information disclosure vulnerabilities.
**Prevention:** Always fail securely by logging the error on the server side (e.g., `console.error`) and returning a generic, user-friendly error message to the client without exposing the underlying `error.message` or `error.stack`.
