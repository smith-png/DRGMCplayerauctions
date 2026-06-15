## 2024-11-20 - Ensure state-toggling buttons are accessible
**Learning:** Some state-toggling buttons like expand/collapse buttons (+/-) don't have enough context, especially for screen readers. Using the `aria-expanded` attribute dynamically helps screen readers understand the current state, and the `aria-label` provides a description of the button's action based on its state.
**Action:** Use `aria-expanded` and a dynamic `aria-label` for buttons that toggle state (e.g., expand/collapse or show/hide).
