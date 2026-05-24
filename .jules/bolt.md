## 2024-05-24 - Performance Optimizations
**Learning:** Found an O(N*M) calculation that was blocking the main thread synchronously in the Teams page (`teamsWithRosters` filtering). It ran on every render for both admin and viewer roles, making interactions like expanding team drawers visibly slow.
**Action:** Lift the logic to the top level, wrapping it in a `useMemo` so we only recalculate on data/filter changes instead of any generic render.
