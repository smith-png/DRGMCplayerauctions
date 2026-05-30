## 2025-05-30 - Added ARIA labels to icon-only buttons
**Learning:** Found several close/dismiss buttons using only visual symbols like "×" or "✕" across various components (`AuctionLive.jsx`, `PlayerProfiles.jsx`, `Teams.jsx`). Screen readers might not interpret these correctly.
**Action:** Always add descriptive `aria-label` attributes to such buttons to improve accessibility and ensure the action's intent is clear to all users.
