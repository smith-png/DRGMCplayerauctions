## 2025-03-15 - Missing ARIA labels on icon-only buttons
**Learning:** Icon-only buttons in the application (such as the password visibility toggle in the Login form) frequently use visually descriptive symbols (like 👁️) and a `title` attribute for mouse users, but lack `aria-label` attributes for screen reader accessibility. This pattern might exist in other components as well.
**Action:** Always check icon-only buttons and make sure they include a descriptive `aria-label` alongside any existing titles or icons.
