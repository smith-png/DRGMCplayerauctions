## 2026-04-20 - Add accessibility labels to icon buttons
**Learning:** Found multiple instances of buttons using only `✕`, `×`, or `+`/`-` characters without descriptive text. These patterns are common in modals and expansion panels but are inaccessible to screen readers without `aria-label`.
**Action:** Always ensure icon-only action elements (close buttons, toggles, discard buttons) have descriptive `aria-label`s. Dynamically update labels when state changes (e.g., expand/collapse). Also, ensure `alt` attributes are present on profile/roster thumbnail images.
