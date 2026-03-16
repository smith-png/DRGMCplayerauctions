## 2024-05-20 - Concurrent Database Queries
**Learning:** In the Node.js Express/PostgreSQL backend, performing sequential independent database queries (e.g., getting counts from different tables for a dashboard) adds up significant network round-trip time.
**Action:** Always group independent `pool.query` calls using `Promise.all` to execute them concurrently and reduce overall response latency.
