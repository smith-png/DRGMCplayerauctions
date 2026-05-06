## 2024-05-18 - Memoizing large array sorting
**Learning:** Found an `O(N log N)` sort operation on `allPlayers` within the render cycle of `frontend/src/pages/PlayerProfiles.jsx`. As the player registry grows, executing this on every render (e.g. state changes like modal opening or page switching) blocks the main thread and introduces UI lag.
**Action:** Use `React.useMemo` to cache the sorted array, only recalculating it when `allPlayers` or `playerSortBy` actually changes. Keep an eye out for similar nested inline array operations in render loops.
