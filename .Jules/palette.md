## 2024-04-28 - Icon-Only Button Accessibility Pattern
**Learning:** Found a recurring pattern across the application where icon-only modal close buttons (`×`, `✕`) were missing `aria-label` and `title` attributes (e.g., in `AuctionLive`, `PlayerProfiles`, `Teams`). Screen readers would just read out the character.
**Action:** Added semantic `aria-label`s and `title` attributes to ensure accessibility and better tooltips. In the future, actively look for these isolated Unicode characters serving as buttons to improve general accessibility.
