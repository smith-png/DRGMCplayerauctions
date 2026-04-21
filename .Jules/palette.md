## 2026-04-21 - Add aria-labels to icon-only buttons
**Learning:** Found multiple instances of icon-only buttons (like × or +/-) that lack screen reader context. Standard UX practice suggests these need aria-labels.
**Action:** Always verify icon-only buttons have descriptive aria-labels (e.g. aria-label="Close dialog") during component updates.
