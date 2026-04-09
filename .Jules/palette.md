## 2024-04-09 - Accessible Expand/Collapse and Dismiss Buttons
**Learning:** Icon-only buttons for actions like expanding details ('+' or '-') and dismissing dialogs ('x') often lack `aria-label`s and state management attributes (`aria-expanded`). This causes screen readers to announce unhelpful text like "plus button" or "times button".
**Action:** When adding or reviewing icon-only buttons, ensure an `aria-label` accurately describes the action (e.g. "Expand team details" vs "Collapse team details") and `aria-expanded` is used to denote state if applicable.
