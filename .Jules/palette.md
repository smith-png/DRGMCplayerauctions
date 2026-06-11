## 2024-11-20 - Unassociated form labels and custom inputs lacking ARIA roles
**Learning:** Found a common pattern where form labels lacked `htmlFor` attributes pointing to input `id`s, reducing click targets and affecting screen reader context. Custom input elements (like button groups acting as radio options) also lacked proper `role="radiogroup"` and `aria-checked` states.
**Action:** When reviewing custom UI elements in forms, always verify label association and ensure custom input states are announced to assistive technology with proper ARIA roles.
