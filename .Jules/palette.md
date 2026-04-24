## 2024-04-24 - Accessible Icon Buttons in List Views
**Learning:** When using expandable list items with icon-only toggle buttons (like '+' or '-'), relying solely on visual cues makes navigation extremely difficult for screen reader users, as context about *what* is being expanded is lost.
**Action:** Always pair `aria-expanded` attributes with dynamic `aria-labels` that reference the specific item's name (e.g., `aria-label="Expand Team Alpha details"`) rather than generic labels, ensuring full context is provided.
