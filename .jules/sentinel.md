## 2026-06-03 - [Added express-rate-limit to login endpoints]
**Vulnerability:** No rate limiting implemented on the /login and /register endpoints.
**Learning:** Common pattern across Express apps. This is a HIGH priority to prevent bruteforcing or credential stuffing.
**Prevention:** Install `express-rate-limit` and apply it properly across high risk authentication endpoints.
