## 2024-05-18 - [Fix Authorization Bypass in placeBid]
**Vulnerability:** Broken Access Control / IDOR in the `placeBid` endpoint. The server accepted a `teamId` from the request body without verifying if the user was actually authorized to place a bid on behalf of that team.
**Learning:** The system lacked a role-based authorization and ownership validation check for the crucial bidding logic. If `req.user.role === 'team_owner'`, it must be verified that `req.user.team_id` matches the requested `teamId`.
**Prevention:** Ensure proper authentication and authorization checks (comparing user's identity data with the resource being acted upon) are performed on all sensitive endpoints before proceeding to execute core functionality.
