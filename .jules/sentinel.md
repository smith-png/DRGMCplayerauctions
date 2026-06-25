## 2024-06-25 - [Fix Unauthenticated Queue Access]
**Vulnerability:** The `/api/auction/queue/upcoming` endpoint was completely unauthenticated and accessible to the public, leaking the upcoming auction queue without requiring any roles.
**Learning:** This repo lacked route-level authentication on an informational endpoint containing potentially sensitive auction details.
**Prevention:** Always verify that every route definition requires the `authenticateToken` middleware unless explicitly intended for public consumption.
