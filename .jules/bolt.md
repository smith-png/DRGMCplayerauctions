## 2024-05-18 - Memoizing Array Operations in Render
**Learning:** Performing inline array transformations like `.filter` (O(N)) with `.toLowerCase()` calls, or `.sort` (O(N log N)) directly within JSX causes expensive recalculations on every render. In components that handle real-time updates via WebSockets or frequent search keystrokes, this quickly becomes a performance bottleneck and causes jank.
**Action:** Always extract array transformations that depend on stable data to memoized variables using `useMemo`.
