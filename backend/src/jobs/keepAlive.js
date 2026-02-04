// This file handles the keep-alive mechanism for Render.com free tier
// Render spins down services after 15 minutes of inactivity
// This job will be pinged by cron-job.org to keep the service active

export function setupKeepAliveJob(app) {
    /**
     * Health check endpoint - used by cron jobs to keep service alive
     * responds with server status
     */
    app.get('/health/keep-alive', (req, res) => {
        try {
            res.status(200).json({
                status: 'ACTIVE',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                message: 'Service is running and active'
            });
        } catch (error) {
            console.error('Keep-alive health check error:', error);
            res.status(500).json({ status: 'ERROR', error: error.message });
        }
    });

    return true;
}

// Optional: Log when the keep-alive endpoint is called
export function logKeepAliveCall(req, res, next) {
    if (req.path === '/health/keep-alive') {
        console.log(`[KEEP-ALIVE] ${new Date().toISOString()} - Service pinged to stay active`);
    }
    next();
}