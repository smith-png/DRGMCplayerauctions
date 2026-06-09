## 2024-06-11 - Sequential DB queries in Admin Dashboard
**Learning:** The `getDashboardStats` endpoint was executing 4 independent COUNT queries sequentially, increasing latency linearly with each additional table tracked.
**Action:** Always use `Promise.all()` to run independent database queries concurrently when assembling dashboard statistics to bound the latency to the single slowest query.
