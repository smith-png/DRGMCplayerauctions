// Simple in-memory rate limiter to prevent brute-force attacks on sensitive endpoints like login.
// 🛡️ Security Enhancement: Prevents repeated guessing of passwords by limiting requests per IP.

const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5; // Allow 5 attempts per window

// Run a cleanup interval to prevent memory leaks from unbounded Map growth
setInterval(() => {
    const now = Date.now();
    for (const [ip, info] of loginAttempts.entries()) {
        if (now - info.firstAttempt > WINDOW_MS) {
            loginAttempts.delete(ip);
        }
    }
}, WINDOW_MS);

export const loginRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
        return next();
    }

    const attemptInfo = loginAttempts.get(ip);
    const timePassed = Date.now() - attemptInfo.firstAttempt;

    // Reset window if time passed is greater than the window
    if (timePassed > WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
        return next();
    }

    // Increment count if within window
    if (attemptInfo.count >= MAX_ATTEMPTS) {
        console.warn(`🛡️ Security: Rate limit exceeded for IP ${ip}`);
        return res.status(429).json({
            error: 'Too many login attempts from this IP, please try again after 15 minutes'
        });
    }

    attemptInfo.count += 1;
    loginAttempts.set(ip, attemptInfo);

    next();
};
