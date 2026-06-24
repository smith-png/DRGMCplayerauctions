## 2026-06-24 - Accessibility on Forms
**Learning:** Found form fields lacking explicit id/htmlFor association. Form toggle buttons for password hiding also needed aria-label & aria-pressed. Standard accessibility issues were common in generic input fields.
**Action:** Always link labels with htmlFor to input ids, and add ARIA attributes for toggle-state icon-only buttons.
