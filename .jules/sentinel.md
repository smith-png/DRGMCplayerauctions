## 2024-07-02 - Fix Authorization Bypass in placeBid
**Vulnerability:** The `/api/auction/bid` endpoint allowed any authenticated user to place a bid on behalf of any team by simply providing the `teamId` in the request body.
**Learning:** Even if an endpoint requires authentication (`authenticateToken`), authorization must be explicitly verified to ensure the user has the right to perform the action on the requested resource (`teamId`).
**Prevention:** Implement role-based or ownership checks directly in the controller (e.g., verifying `req.user.role === 'admin'` or `req.user.team_id === teamId`). Always trust the JWT token over client-provided identifiers for authorization purposes.
