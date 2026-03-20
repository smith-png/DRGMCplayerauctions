## 2024-03-20 - Adding keyboard accessibility to generic interactive elements
**Learning:** React components in this codebase frequently use `<div>` elements as interactive buttons (e.g., `onClick` handlers) without proper accessibility attributes. This pattern prevents keyboard users from interacting with modals, overlays, and specific card elements.
**Action:** When implementing custom interactive elements, always ensure they have `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler that triggers the same action on 'Enter' or 'Space' key presses to maintain keyboard accessibility.
