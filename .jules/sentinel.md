
## 2024-05-20 - IDOR Vulnerability in Auction Bidding
**Vulnerability:** The `/auction/bid` endpoint had an Insecure Direct Object Reference (IDOR) vulnerability. Team owners could pass any `teamId` in the request body to place bids and drain the budgets of other teams.
**Learning:** Never trust the client-provided `teamId` when performing sensitive operations (like placing bids and deducting budgets). Always cross-reference the user's assigned team (`req.user.team_id`) to verify authorization.
**Prevention:** Implement role-based and ownership-based authorization checks in all endpoints that alter team states. In `placeBid`, ensure that if the role is `team_owner`, the user's `team_id` from the JWT strictly matches the requested `teamId`.
