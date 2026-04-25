## 2026-04-25 - Rate Limiter Memory Leak Prevention
**Vulnerability:** Missing rate limiting on sensitive login endpoint (brute force risk). When adding an in-memory Map-based rate limiter to fix it, an unbounded Map memory leak could occur over time.
**Learning:** In-memory tracking structures for security features (like IP rate limiters) must have automatic cleanup mechanisms (e.g., `setInterval` to prune old entries). Otherwise, the security mechanism itself can cause an Out-Of-Memory DoS vulnerability.
**Prevention:** Always implement a cleanup strategy (TTL/pruning) when using Maps or Arrays to track unbounded user inputs or IP addresses in memory.
