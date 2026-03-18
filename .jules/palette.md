## 2024-05-19 - Added ARIA attributes for custom buttons
**Learning:** In this application, custom interactive components like `div` or `span` used as buttons or links often lack accessibility attributes out of the box. Specifically, the `user-info` navbar item and player profile cards used `onClick` without `role`, `tabIndex`, or keyboard support.
**Action:** When adding or modifying interactive elements that aren't native `<button>` or `<a>` tags, always ensure they explicitly include `role`, `tabIndex={0}`, and an `onKeyDown` handler to support keyboard navigation.
