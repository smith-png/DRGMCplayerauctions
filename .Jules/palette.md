## 2024-06-07 - Added ARIA labels to icon-only buttons
**Learning:** The app frequently uses icon-only buttons (like `✕` for closing modals or `+`/`-` for expanding sections) that lacked screen reader support. Adding `aria-expanded` dynamically based on state is important for expand/collapse toggles.
**Action:** When creating or modifying interactive elements, always ensure text-less buttons have descriptive `aria-label` attributes and stateful buttons have proper ARIA attributes like `aria-expanded`.
