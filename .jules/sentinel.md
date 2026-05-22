## 2024-05-18 - Prevent Hardcoded Admin Password Reset on Startup
**Vulnerability:** The application was unconditionally resetting the admin password back to a hardcoded string ('admin123') every time the backend server restarted (`seed_admin.js` was called during `initializeDatabase` in `server.js`).
**Learning:** Hardcoded credentials should never be used, but even worse, initialization scripts must not blindly overwrite passwords if a user already exists, as server restarts can be used to reset an admin account back to a default state.
**Prevention:** Only run seeding logic when the user doesn't already exist. Passwords for default accounts should be set via environment variables.
