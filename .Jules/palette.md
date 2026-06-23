## 2024-06-23 - Added ARIA attributes to dismiss/expand buttons
**Learning:** Found multiple instances of icon-only dismiss and expand/collapse buttons lacking semantic `aria-label` or `aria-expanded` attributes. Adding these attributes significantly improves screen reader accessibility without changing visual presentation.
**Action:** Always check icon-only buttons (`×`, `+`, `−`, etc.) for missing ARIA labels or state attributes when auditing components for accessibility.
