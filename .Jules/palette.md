## 2024-05-19 - Added ARIA labels to icon-only buttons
**Learning:** Found multiple instances of icon-only close buttons (e.g., using "×" or "✕" characters) that lacked explicit `aria-label` attributes. Screen readers would announce these inconsistently, usually as "times" or "multiply".
**Action:** Added `aria-label="Close"` to these buttons across several modal and overlay components (`AuctionLive.jsx`, `PlayerProfiles.jsx`, `PlayerProfilesBySport.jsx`, `Teams.jsx`) to ensure consistent accessibility. Future modal implementations should include this attribute by default.
