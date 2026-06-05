## 2026-06-05 - Teams With Rosters Optimization
**Learning:** The `teamsWithRosters` calculation in `Teams.jsx` previously ran an O(N * M) nested loop over players and filtered teams on every render for 'viewer' and 'admin' roles.
**Action:** Extract expensive filtering into a `useMemo` and replace nested array iteration with an O(N + M) `Map` lookup to group items by ID.
