## 2025-02-14 - Authorization Bypass in Auction Bidding
**Vulnerability:** In `placeBid` endpoint, the `teamId` is passed in the request body, but it wasn't validated against the authenticated user's `team_id`. This allowed any authenticated user to place bids for other teams (IDOR/BOLA).
**Learning:** Always verify that an action requested for a specific entity (like a team) is authorized for the user requesting it, especially when the entity ID is passed directly in the request body. Don't assume the frontend is only sending the correct `teamId`.
**Prevention:** Compare request body IDs (`teamId`) against the authenticated context (`req.user.team_id`) or ensure the user has 'admin' privileges before processing the action.
