## 2024-05-16 - Icon-Only Buttons Accessibility
**Learning:** Icon-only buttons (like `✕` or `×` for dismissing/closing modals) frequently lacked `aria-label`s across the application components (e.g., Teams, AuctionLive, PlayerProfiles). This makes them inaccessible to screen reader users who rely on text labels to understand button actions.
**Action:** Always verify that buttons containing only icons or visual elements have an appropriate `aria-label` attribute to describe their function.
