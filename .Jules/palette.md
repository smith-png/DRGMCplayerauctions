## 2026-04-27 - Form Accessibility in Login
**Learning:** Found that custom role selectors and input fields were lacking proper ARIA associations and id/htmlFor bindings, impacting screen reader capability.
**Action:** Always ensure custom button groups representing options use `role="radiogroup"` and `role="radio"` with `aria-checked`, and pair labels to inputs via `htmlFor`/`id`.
