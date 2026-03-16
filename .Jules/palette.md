## 2026-03-16 - Add missing keyboard a11y and ARIA labels on custom interactive elements
**Learning:** Interactive components built from generic elements like `<div>` (e.g., the User Menu dropdown) lack native keyboard support and semantic roles, rendering them completely inaccessible to keyboard and screen reader users in this application. Icon-only buttons also require `aria-label`.
**Action:** Always add `role="button"`, `tabIndex={0}`, `aria-expanded`, and an `onKeyDown` handler to custom interactive components, and ensure all icon-only buttons include an `aria-label`.
