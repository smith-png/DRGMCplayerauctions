## PALETTE JOURNAL\n\n
## 2026-03-25 - Added ARIA labels and expanded attributes to toggle buttons
**Learning:** The 'expand-btn' in Teams view relies heavily on visual +/- signs without providing context to screen readers on what is being expanded.
**Action:** Apply `aria-expanded` and `aria-label` with context (`Expand [Team Name] details`) for purely visual toggle buttons.
