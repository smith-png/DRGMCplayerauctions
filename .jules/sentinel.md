## 2025-05-18 - Fix Authorization Bypass on Bidding Endpoint
**Vulnerability:** The `placeBid` API endpoint was protected with `authenticateToken`, but completely lacked role-based or ID-based authorization checks. A viewer or a team owner could place bids on behalf of any team.
**Learning:** Middlewares like `authenticateToken` only check if the user is logged in, but not *who* they are. Always check the JWT payload and verify the user has the right to act on the target resource (IDOR).
**Prevention:** Implement `authorizeRoles` or explicit manual checks against `req.user` claims and corresponding database assignments on sensitive operations.
