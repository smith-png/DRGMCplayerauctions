## 2024-07-06 - [React Hook Usage in Derived State]
**Learning:** Found complex O(N*M) filtering inside a render path of functional component, and the same calculation was being duplicated instead of shared via `useMemo`.
**Action:** Always memoize derived state logic like filtering and mapping with `useMemo`, especially when involving multiple arrays, to prevent cascading re-renders when local UI state updates (like an accordion toggle).
