## 2024-04-16 - Derived State in React
**Learning:** Found an anti-pattern in `frontend/src/pages/PlayerProfilesBySport.jsx` where derived state (`filteredPlayers`) was being synchronized using `useEffect` and local state. This causes unnecessary secondary re-renders.
**Action:** Always prefer computing derived values directly during render or use `useMemo` for expensive operations instead of syncing them with `useEffect`.
