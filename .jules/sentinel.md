## 2026-05-23 - [Insecure Direct Object Reference in placeBid]
**Vulnerability:** The `placeBid` function in `backend/src/controllers/auctionController.js` accepted a `teamId` from the user input but did not verify if the authenticated `team_owner` was actually assigned to that `teamId`.
**Learning:** Team owners were able to bid using other teams' budgets because role-based access control was implemented, but not object-level authorization (IDOR).
**Prevention:** Always verify that the authenticated user has permission to perform actions on the specific object ID they provide in the request body, especially for financial or budget-impacting transactions.
