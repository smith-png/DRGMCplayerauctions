## 2026-05-15 - ARIA Labels for Icon-Only Buttons
**Learning:** This application heavily utilizes icon-only buttons for interactions such as expand/collapse (e.g. Teams.jsx `+`/`-`), closing modals (`x`), and destructive actions (e.g. Teams.jsx player release `x`). These lack accessible ARIA tags which hurts screen reader support.
**Action:** Always add `aria-label` to these components. For stateful icons like expand/collapse, ensure that the corresponding `aria-expanded` tag dynamically switches, and that the `aria-label` text gives full context of the content that's expanding/collapsing.
