## 2026-06-06 - React useEffect Derived State
**Learning:** Discovered derived state mapped through `useState` and `useEffect` which causes double-renders and impacts performance.
**Action:** Replaced the redundant `useEffect` state assignment with `useMemo` in `PlayerProfilesBySport.jsx` to synchronously calculate state on render and improve performance.
