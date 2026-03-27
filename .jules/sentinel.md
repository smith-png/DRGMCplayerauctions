## 2024-05-24 - [BOLA/IDOR in placeBid]
**Vulnerability:** Found a Missing Object Level Authorization (BOLA/IDOR) vulnerability in the `placeBid` controller function in `backend/src/controllers/auctionController.js`. It accepted the `teamId` from the request body without checking if the user actually owns that team.
**Learning:** Any authenticated user could spoof the `teamId` and place bids on behalf of other teams.
**Prevention:** Implement role-based access control and verify ownership. If the user is a `team_owner`, check that their `req.user.team_id` matches the `teamId` in the request body. Admin and auctioneer roles should be able to place bids for any team.
