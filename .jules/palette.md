## 2024-03-21 - [Navbar User Overlay Keyboard Accessibility]
**Learning:** Found an accessibility issue pattern where custom interactive components (like generic `<div>` elements used as dropdown toggles in `Navbar.jsx`) lacked keyboard accessibility attributes, making them inaccessible to screen readers and keyboard users.
**Action:** Always explicitly include keyboard accessibility attributes (`role="button"`, `tabIndex={0}`, `aria-expanded`, and an `onKeyDown` handler) when using non-semantic elements for interaction.
