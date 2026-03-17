## 2024-10-27 - Sequential Query Bottlenecks in Controllers
**Learning:** This codebase often performs multiple independent database queries sequentially in controllers (e.g., fetching counts for different tables to build a dashboard stats object). This sequential execution pattern causes unnecessary cumulative round-trip latency.
**Action:** Always scan controllers for multiple independent `pool.query()` calls and group them into `Promise.all()` to execute them concurrently, significantly reducing response times.
