## 2026-05-04 - [React useMemo Optimization]
**Learning:** Found an O(n^2) unoptimized data-transformation map within filter in Teams.jsx that was computed every render for Viewer and Admin views without memoization.
**Action:** Use `useMemo` to memoize the calculation and prevent recalculations when dependencies haven't changed. Also removed duplication. Need to make sure no hooks are added inside conditional blocks.
