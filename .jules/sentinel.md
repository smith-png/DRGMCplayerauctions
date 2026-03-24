## 2024-05-24 - Authorization Bypass (IDOR) in Bidding System
**Vulnerability:** The `placeBid` function allowed any authenticated user to place bids on behalf of any team by simply providing the `teamId` in the request body. There was no validation to check if the user actually had permission to bid for that team.
**Learning:** Object-Level Authorization must be explicitly enforced. Just because an endpoint is protected by `authenticateToken` does not mean the user has permission to perform actions on arbitrary resources (like another team's budget).
**Prevention:** Always validate ownership by comparing the requested resource ID (e.g. `teamId` in the request body) against the user's assigned resource ID from their verified JWT token (`req.user.team_id`).
