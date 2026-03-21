
## 2026-03-21 - Concurrent Database Queries
**Learning:** In the DRGMC Player Auction System backend, the `getDashboardStats` controller was executing multiple independent `pool.query()` operations sequentially (e.g., counting users, players, teams, and bids). This sequential execution creates unnecessary network round-trip latency and blocks the thread longer than necessary, forming a clear performance bottleneck.
**Action:** Consolidate independent database queries in controllers using `Promise.all()` to execute them concurrently, significantly reducing overall response time and network latency overhead. Always look for sequential independent `await pool.query()` calls that can be batched.
