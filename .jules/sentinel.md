## 2026-06-26 - [Added IDOR Protection to Auction Bids]
**Vulnerability:** IDOR (Insecure Direct Object Reference) in `placeBid`. Any authenticated user could place a bid specifying *any* `teamId`.
**Learning:** The `placeBid` API relied only on the provided `teamId` from the payload without verifying that the user making the request actually owned or had rights to bid for that team.
**Prevention:** Always verify ownership and authorization on user inputs rather than trusting the client payload. Validate `teamId` against `user.team_id` from the decoded JWT token.
