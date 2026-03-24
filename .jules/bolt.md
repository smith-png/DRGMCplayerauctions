## 2024-05-24 - Network Waterfall in Tab Components
**Learning:** In complex dashboards with multiple tabs (like `AdminDashboard.jsx`), sequential data fetching for related entities (users, players, teams) can cause significant UI blocking and network waterfall effects when switching between tabs.
**Action:** Use `Promise.all()` or `Promise.allSettled()` to fetch independent data sources concurrently, minimizing the overall load time to the slowest individual request rather than the sum of all requests.
