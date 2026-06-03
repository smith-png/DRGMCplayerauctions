## 2024-06-03 - Sequential API Bottlenecks
**Learning:** Multiple dashboard components (like `AdminDashboard.jsx` and `Teams.jsx`) suffer from sequential API await chains, which increases total page load time linearly with each request.
**Action:** Check data-loading functions for sequential `await`s that have no data dependency on each other, and refactor them to use `Promise.all` or `Promise.allSettled` to reduce waterfall requests.

## 2024-06-03 - `Promise.all` optimization in `Teams.jsx`
**Learning:** `Teams.jsx` makes multiple sequential API requests depending on the user role (e.g. `teamOwnerAPI.getMyTeam()`, `teamOwnerAPI.getMyTeamPlayers()`, `teamOwnerAPI.getMyTeamBids()`). This is an O(N) penalty to TTFB where they can easily be batched.
**Action:** Replace `await` chains with `Promise.all` for parallelized execution where possible to make the application significantly faster, reducing waterfalls.
