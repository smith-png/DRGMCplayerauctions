## 2026-06-02 - [React render optimization]
**Learning:** Found an expensive `filteredTeams.map` block happening repeatedly on every render inside `Teams.jsx` and `AdminDashboard.jsx`.
**Action:** Use `useMemo` to wrap expensive computations and prevent them from recalculating on every re-render when dependencies haven't changed.
