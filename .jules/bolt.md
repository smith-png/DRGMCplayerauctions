## 2026-05-30 - Memoizing array sorting in React renders
**Learning:** Found an inline array sort within a React component's render loop (O(n log n) operations on every render, including for pagination).
**Action:** Used `useMemo` to memoize the sorted array so it only re-sorts when the underlying data or sort preference changes.
