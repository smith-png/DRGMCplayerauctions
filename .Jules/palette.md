## 2024-05-18 - Missing Accessibility Associations in Login Form
**Learning:** The custom `input-group` and `role-options` UI patterns used in `Login.jsx` omitted basic accessibility features like `htmlFor`/`id` associations for labels, and ARIA roles for custom radio buttons, making the form very difficult to use with screen readers.
**Action:** Always ensure custom UI controls have appropriate ARIA roles (`radiogroup`, `radio`) and standard form inputs have explicitly associated labels (`htmlFor`).
