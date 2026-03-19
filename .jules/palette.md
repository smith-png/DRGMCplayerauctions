## 2024-05-24 - [Keyboard Accessibility for Interactive Divs]
**Learning:** Custom generic `<div>` elements used as interactive components (like dropdown menus) are not natively keyboard accessible. Users navigating via keyboard cannot focus or activate them.
**Action:** When creating custom interactive elements out of non-semantic HTML tags, always add `role="button"`, `tabIndex={0}`, `aria-expanded` (if a toggle), `aria-haspopup="true"` (if a menu), and an `onKeyDown` handler to capture 'Enter' and 'Space' keypresses to replicate the click behavior.
