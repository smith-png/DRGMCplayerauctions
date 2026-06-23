## 2024-06-23 - `Teams.jsx` Rendering Performance
**Learning:** `Teams.jsx` maps over `filteredTeams` and uses `players.filter` inside the `map` loop to find rosters for each team. This creates an O(N*M) nested loop (where N is the number of teams and M is the number of players). This calculation happens directly in the render function without `useMemo`, causing it to execute on every re-render (e.g. when state changes, like opening/closing a modal or expanding a team).

**Action:** Extract this computation into a `useMemo` hook at the top level of the component and use a hash map for O(N+M) complexity. This will improve rendering performance significantly as the player list grows.
