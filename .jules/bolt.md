## 2024-05-16 - Prevent unnecessary re-renders using useMemo in React
**Learning:** Using `useEffect` to synchronize state derivatives (like filtering a list based on another state) causes unnecessary double re-renders in React. The first render happens when the dependency state (e.g., `yearFilter`) changes, then `useEffect` runs and updates the derived state (`filteredPlayers`), causing a second render.
**Action:** Always use `useMemo` for derived state calculations. This computes the derived value during the initial render phase, saving a complete render cycle.
