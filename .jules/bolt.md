## 2026-05-31 - Memoizing Inline Sorting in Render Cycles
**Learning:** React components containing large datasets being mapped or processed inline will execute O(N log N) or worse operations on every re-render (like pagination clicks or modal opens). `[...allPlayers].sort(...)` directly inside JSX rendering is a massive anti-pattern for performance, specifically on feeds/lists.
**Action:** Extract list sorting and heavy filtering logic into `useMemo` hooks before the JSX return to only recalculate when dependencies change. Ensure `useMemo` is properly imported.
