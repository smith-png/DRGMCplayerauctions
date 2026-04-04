## 2025-05-18 - Avoid O(N^2) lookups during rendering
**Learning:** Found a performance bottleneck where a search component in `AuctionLive.jsx` filtered a large array (`allPlayers`) by repeatedly using `.find()` against another array (`eligiblePlayers`). This resulted in an $O(N \times M)$ operation on every render and keystroke, degrading performance.
**Action:** When filtering a large list against another collection, precompute a `Set` from the lookup collection using `useMemo`. This turns the $O(M)$ lookup into an $O(1)$ operation, improving the overall filter performance to $O(N)$.
