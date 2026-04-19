## 2026-04-19 - [IDOR in placeBid]
**Vulnerability:** IDOR vulnerability in `placeBid` allowed any user to bid on behalf of any team by simply changing the `teamId` in the request body.
**Learning:** Critical endpoints that perform actions on behalf of a specific entity (like a team) must explicitly verify that the authenticated user has the rights to perform that action for that specific entity, not just that they are authenticated.
**Prevention:** Always query the database to verify ownership or authorization mappings (e.g. checking if user's `team_id` matches the requested `teamId`) before executing state-changing operations.
