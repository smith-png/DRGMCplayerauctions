## 2026-05-24 - Missing ARIA Labels on Modals
**Learning:** React icon-only buttons (like ✕) in standard modal patterns here lacked accessible names.
**Action:** When adding modals or toggles, always add `aria-label` (and `aria-expanded` for toggles) for screen readers.
