## 2024-05-24 - Accessible Icon Buttons in Lists
**Learning:** Found a recurring pattern across the app where interactive list components (accordions, rosters, modals) use symbolic characters (+, −, ×, ✕) as button content without accompanying ARIA labels or state attributes (`aria-expanded`). This makes navigation very confusing for screen reader users as they only hear the symbol rather than the action.
**Action:** Always add descriptive `aria-label`s to icon/symbol-only buttons. For accordion-style components, ensure `aria-expanded` is bound to the open/closed state variable.
