## 2026-06-10 - O(N log N) Sorting in React Render
**Learning:** Sorting an entire array directly inside the render loop causes significant overhead, particularly in lists with pagination (where `[...allPlayers].sort(...)` creates a new array and sorts it on *every* single re-render or state update like pagination/modal opening).
**Action:** Always wrap expensive operations like `.sort()` or large `.filter` chains in `useMemo` and depend only on the underlying list and sorting parameters.
