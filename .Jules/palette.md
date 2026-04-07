
## 2024-05-15 - Improved Accessibility in Authentication Forms
**Learning:** Custom interactive elements (like text-toggling for passwords and role selection groups) are completely invisible to screen readers without ARIA attributes.
**Action:** Always add `aria-label`, `role="group"`, and `aria-pressed` for custom inputs, and use `role="alert"` / `aria-live="assertive"` for dynamic error messages.
