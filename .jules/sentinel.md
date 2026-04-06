## 2024-05-18 - [Critical] Hardcoded Admin Password & Insecure Seeding
**Vulnerability:** The `seed_admin.js` script hardcoded the admin password as `admin123` and forcefully reset it on every server restart.
**Learning:** This is a severe vulnerability as anyone who knew the repository or the default setup could simply restart the server (or wait for a deployment) to gain admin access. It also undermined legitimate password changes by the admin, as their password would revert to the hardcoded default upon restart.
**Prevention:**
- Never hardcode credentials in source code.
- Always use environment variables for secrets (e.g., `ADMIN_PASSWORD`).
- Auto-generate secure random passwords if default credentials are not provided.
- Only perform destructive actions like resetting an admin password when explicitly instructed (e.g., using a flag like `RESET_ADMIN_PASSWORD=true`).