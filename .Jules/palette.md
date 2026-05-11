## 2026-05-11 - Adding context to password visibility toggle
**Learning:** Found an accessibility issue pattern specific to this app's components, where the password visibility toggle button had no context for screen readers. It just displayed "SHOW" or "HIDE" as text, which does not announce the action properly.
**Action:** Always add an `aria-label` to buttons that perform a specific action, especially those that toggle states like password visibility. Ensure the label clearly describes the action that will be performed (e.g., "Show password", "Hide password").
