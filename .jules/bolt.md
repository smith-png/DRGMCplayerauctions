## 2024-03-19 - Concurrent Database Queries in Aggregation Endpoints
**Learning:** In backend controllers, independent database queries (like multiple `pool.query()` calls for different stats in a dashboard endpoint) are often awaited sequentially. This results in cumulative network round-trip latency, acting as a measurable performance bottleneck.
**Action:** Always identify independent database calls and execute them concurrently using `Promise.all()` to reduce total execution time to the duration of the slowest single query.
