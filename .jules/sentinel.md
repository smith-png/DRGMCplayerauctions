## 2024-05-24 - [Critical] Fixed Hardcoded Admin Password Reset on Startup
**Vulnerability:** The application was resetting the admin user's password to a hardcoded value (`admin123`) on every server startup, allowing unauthenticated attackers to guess the default and takeover the admin account on deployments.
**Learning:** The `seed_admin.js` script was resetting the password even if the user already existed.
**Prevention:** Ensured the startup script only creates the admin user if they don't exist and used environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) instead of hardcoded strings. Also added a startup check for `JWT_SECRET`.
