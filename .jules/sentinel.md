## 2026-06-20 - [IDOR in Bid Placement]
**Vulnerability:** Any authenticated user could place a bid for any team by providing the target team's ID in the `placeBid` API payload, allowing unauthorized budget manipulation and bid interference.
**Learning:** `teamId` supplied in request payloads for sensitive actions must be verified against the authenticated user's session context (`req.user.team_id`), rather than blindly trusted, to prevent Insecure Direct Object Reference (IDOR).
**Prevention:** Implement server-side authorization checks verifying ownership/association of the provided resource ID against the user's session token data before allowing mutations. Always validate `req.body.teamId === req.user.team_id`.
