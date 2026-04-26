## 2024-04-26 - React Anti-Pattern: useEffect for derived state
**Learning:** Using `useEffect` to derive state (like filtering a list of players) causes unnecessary double renders. In `PlayerProfilesBySport.jsx`, `filteredPlayers` was managed in state and updated via an effect dependent on `players` and `yearFilter`.
**Action:** Replace `useEffect` and `useState` for derived state with `useMemo` to compute derived state synchronously during render. This prevents the extra render cycle and improves performance.
