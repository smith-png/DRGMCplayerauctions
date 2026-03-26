## 2025-02-14 - User Info Dropdown Accessibility
**Learning:** Found a common pattern where user profile dropdown toggles use `div` elements with only `onClick` handlers. Without keyboard navigation and screen reader attributes, these crucial interactive elements are inaccessible to a significant portion of users.
**Action:** Always ensure that custom dropdown toggles (using `div` or `span`) include `role="button"`, `tabIndex={0}`, `aria-expanded` state, and an `onKeyDown` handler to support `Enter` and `Space` keys (with `e.preventDefault()` to stop unintended scrolling).
