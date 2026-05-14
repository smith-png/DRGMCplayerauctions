## 2024-05-18 - Unnecessary Renders and State Calls
**Learning:** `AuctionLive.jsx` defines state variable `allPlayers` with `const [allPlayers, setAllPlayers] = useState([])` but `setAllPlayers` is never called. However, `allPlayers` is mapped and filtered over inside the component rendering, which will always use the initial empty array since it's never set. Furthermore, `allPlayers` is locally shadowed in `loadSoldPlayers` but this doesn't update the state.
**Action:** Remove `setAllPlayers` if unused or populate `allPlayers` properly in an effect. But for a performance fix, I should find a real bottleneck. Let me look for missing `useMemo` or `React.memo`.

## 2024-05-18 - Missing Indexes on DB
**Learning:** Checking for indexes is a common backend performance optimization. We should see if there are missing indexes in `create_db.sql`.
**Action:** Let's inspect `backend/create_db.sql` or `migrations/`.

## 2024-05-18 - Unnecessary Duplicate State / Renders in Live Auction
**Learning:** React components sometimes use unneeded nested renders or fetch completely unnecessary data that they don't even display. For example, `AuctionLive.jsx` has a lot of things loading on every refresh and `allPlayers` isn't used correctly. Wait, what about `TeamCarousel.jsx`? It duplicates array multiple times for marquee effect. There's also `React.memo` that we could add to components that re-render too often.
**Action:** Let's look for a small performance optimization in `frontend/src/components` or `frontend/src/pages` like adding `React.memo` to `TeamCarousel` or `FooterTicker`, which are static but might get re-rendered when `Home.jsx` re-renders. Wait, `Home.jsx` doesn't have local state.
Let's check `PlayerProfiles.jsx` to see if there are expensive renders or missing React.memo on list items.

## 2024-05-18 - Missing useMemo for Sorting
**Learning:** In `PlayerProfiles.jsx`, `allPlayers` is sorted inline within the render loop: `[...allPlayers].sort(...)`. This means every time the component re-renders (e.g., when an overlay is opened, or when `soldPage` changes, or when `selectedPlayer` is clicked), the entire list of `allPlayers` is duplicated and re-sorted, which is an O(N log N) operation performed synchronously in the render loop.
**Action:** Wrap the sorting logic in a `useMemo` so it only re-runs when `allPlayers` or `playerSortBy` changes.
