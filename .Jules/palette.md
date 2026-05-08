## 2026-05-08 - [Added ARIA Labels to Icon-only Buttons]
**Learning:** Found instances where `✕` buttons were used for actions like closing modals or releasing players. These lacked accessible names, making them unclear to screen reader users.
**Action:** Add `aria-label`s with descriptive text to any icon-only buttons to ensure clear intent for assistive technologies.
