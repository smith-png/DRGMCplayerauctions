import axios from 'axios';

let isSchedulerRunning = false;

export function startInternalScheduler() {
    if (isSchedulerRunning) {
        console.log('⚠️ Scheduler already running, skipping start.');
        return;
    }

    isSchedulerRunning = true;

    // Ping own health endpoint every 10 minutes
    const INTERVAL = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
        try {
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            const response = await axios.get(
                `${backendUrl}/health/keep-alive`,
                { timeout: 5000 }
            );
            console.log(`[SCHEDULER] Keep-alive ping successful at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[SCHEDULER] Keep-alive ping failed:', error.message);
        }
    }, INTERVAL);

    console.log('✅ Internal scheduler started - will ping every 10 minutes');
}