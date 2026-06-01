## 2025-02-27 - 🛡️ Sentinel: [HIGH] Fix IDOR in placeBid Endpoint
**Vulnerability:** IDOR (Insecure Direct Object Reference) in `placeBid`.
**Learning:** Any authenticated user could place a bid for any team because the `placeBid` controller didn't check if the `req.user` was authorized to place a bid for the specific `teamId` in the request body.
**Prevention:** Ensure the user ID correlates properly with the object being modified, specifically matching a team owner's ID to the team ID they are trying to place a bid for, and validating their role.
