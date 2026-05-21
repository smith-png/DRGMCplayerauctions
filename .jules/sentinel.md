## 2026-05-21 - IDOR in Auction Bidding
**Vulnerability:** The `placeBid` API endpoint allowed any authenticated user to place a bid on behalf of any team by specifying arbitrary `teamId`s in the request body.
**Learning:** Incomplete access controls led to an Insecure Direct Object Reference (IDOR) where the application assumed that if a user is authenticated, they are allowed to act on behalf of the `teamId` supplied in the request. The user's role and assigned `team_id` were not validated against the target `teamId`.
**Prevention:** Always validate that the authenticated user explicitly owns or has administrative rights over the specific object or ID they are attempting to act upon, even if they have passed initial authentication checks.
