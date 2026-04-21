## 2024-05-18 - Missing memoization on large lists
**Learning:** Found an inline sort inside render function in `PlayerProfiles.jsx` component that sorts `allPlayers` array on every render.
**Action:** Always wrap computationally expensive operations like `sort` or `filter` on potentially large arrays with `useMemo` to avoid redundant O(n log n) recalculations during renders.
