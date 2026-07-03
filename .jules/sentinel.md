## 2024-07-03 - Critical IDOR in placeBid Endpoint
**Vulnerability:** The `placeBid` API endpoint lacked proper authorization checks, allowing any authenticated user (even non-admin roles) to place a bid on behalf of any team by simply providing the target `teamId` in the request.
**Learning:** Broken Access Control / IDOR occurs when API endpoints rely entirely on request body data (`teamId`) without verifying that the requesting user (`req.user`) has the correct permissions (e.g., `team_owner` and matching `team_id`) to perform the action.
**Prevention:** Always cross-reference the user's role and assigned resource IDs (`req.user.team_id`) with the requested action payload (`req.body.teamId`) before executing state-changing database transactions.
