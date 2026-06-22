## 2024-06-22 - Authorization Bypass in Bidding
**Vulnerability:** Any authenticated user could place a bid on behalf of any team via the `/api/auction/bid` endpoint because there was no check verifying that the user belonged to the `teamId` specified in the request.
**Learning:** Even when an endpoint is authenticated, direct object references (like `teamId` in a request body) must be validated against the authenticated user's session data (like `req.user.team_id` or `req.user.role`).
**Prevention:** Always implement authorization checks at the resource level, ensuring the user has permissions to perform actions on the specific entities requested.
