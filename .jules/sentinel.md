## 2026-05-05 - [Authorization Bypass on Bidding]
**Vulnerability:** Any authenticated user could place a bid on behalf of any team using the `/api/auction/bid` endpoint because `teamId` from the request body was trusted implicitly.
**Learning:** This exposes a common pattern where parameters identifying resources or entities (like `teamId`) are taken directly from the request body without verifying the authenticated user's authorization to act on that entity.
**Prevention:** Always verify that `req.user.team_id` matches the `teamId` in the request body for team-specific actions, unless the user holds administrative privileges.
