## 2026-05-20 - Memoizing nested loops in React
**Learning:** Found an O(N²) nested loop within the render function of `Teams.jsx` that was recomputing `teamsWithRosters` for every render (including every time a user expanded a team accordion).
**Action:** Replaced the `O(Teams * Players)` `.filter()` inside `.map()` with a single O(Players) hash map grouping, and wrapped it in `useMemo` so it doesn't re-run on purely local state changes like UI expansions. Always look for `.filter()` inside `.map()` during render!
