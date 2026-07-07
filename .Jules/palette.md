## 2024-07-07 - Add Aria Label for Login Password button
**Learning:** Added an `aria-label` to a button that toggles password visibility but lacked clear screen reader text.
**Action:** Always check if icon-only or generic text buttons (like 'SHOW'/'HIDE') need explicit `aria-label` attributes to explain their purpose clearly to screen readers.
