## 2026-05-03 - [Memoize inline sorts in React map functions]
**Learning:** React re-renders can be significantly slowed down if large arrays are copied and sorted inline within JSX map functions (e.g., `[...allPlayers].sort().map()`), especially when pagination forces frequent re-renders.
**Action:** Always check array manipulations inside render cycles and extract expensive operations like sorting into a `useMemo` hook to ensure they are only recalculated when dependencies change.
