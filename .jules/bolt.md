## 2024-05-07 - React useMemo Optimization
**Learning:** Found an unmemoized O(n log n) sorting operation inside the render cycle of PlayerProfiles.jsx causing performance issues on re-renders. Also discovered a missing closing brace in AuctionStats.jsx and fixed a potential null-reference crash.
**Action:** Always check array sorting operations within components and memoize them using `useMemo` if they are derived from state but do not need to run on every render. Also, double check syntax validity for any touched files even if unrelated.
