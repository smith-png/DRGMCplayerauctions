## 2023-10-27 - Form Field Accessibility
**Learning:** Input fields were lacking proper association with labels, and interactive icons like password toggles missed crucial aria attributes, causing issues for screen readers trying to parse custom form components in this app.
**Action:** I will ensure all custom input groups include `htmlFor` attributes matching the input `id` attributes, use `aria-label` and `aria-pressed` for icon-only toggles, and add `aria-busy` to submit buttons with loading states going forward.
