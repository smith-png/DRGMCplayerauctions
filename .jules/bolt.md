## 2024-03-24 - [Backend Optimization: Concurrent Dashboard Queries]
**Learning:** Sequential database queries for aggregate dashboard metrics represent a critical bottleneck when the endpoint depends on aggregating data from several independent tables.
**Action:** Always identify independent database calls in aggregate endpoints and run them concurrently via `Promise.all` to reduce total execution time to that of the slowest single query instead of the sum of all queries.
