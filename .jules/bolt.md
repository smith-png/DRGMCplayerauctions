## 2026-04-13 - [PlayerProfiles Sorting Re-render]
**Learning:** In PlayerProfiles.jsx, sorting `[...allPlayers].sort(...)` was done inline within the render loop. This leads to an expensive O(N log N) sorting operation on every single render, which is problematic since the component frequently re-renders (e.g. from socket updates or modal opens).
**Action:** Extract expensive inline operations into `useMemo` to prevent main-thread blocking during routine interactions.
