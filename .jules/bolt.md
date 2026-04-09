## 2026-04-09 - [Teams.jsx O(n^2) Loop Optimization]
**Learning:** React re-renders are especially punishing when complex O(n^2) data transformations happen inline during rendering (like nested map/filter logic). The `Teams.jsx` page computed `teamsWithRosters` inside specific role views on every render.
**Action:** Use `useMemo` and an O(n) hash map (dictionary lookup) to structure grouped data beforehand. This runs once when inputs change and brings rendering complexity from O(Teams * Players) down to O(Teams + Players).
