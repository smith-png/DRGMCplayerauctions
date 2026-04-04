## 2024-05-18 - Missing Label Associations in Form Groups
**Learning:** The application uses a custom `input-group` structure that systematically omits `htmlFor` on `<label>` elements and `id` on `<input>` elements. This breaks click-to-focus behavior and leaves screen readers without context, a major accessibility issue.
**Action:** Ensure all `<label>` elements use `htmlFor` to explicitly link them to the `id` of their corresponding `<input>` fields.
