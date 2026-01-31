import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database
import pool, { initializeDatabase } from './src/config/database.js';
import seedAdmin from './seed_admin.js';

// Import routes
import authRoutes from './src/routes/auth.js';
import playerRoutes from './src/routes/players.js';
import auctionRoutes from './src/routes/auction.js';
import adminRoutes from './src/routes/admin.js';
import teamRoutes from './src/routes/teams.js';
import teamOwnerRoutes from './src/routes/teamOwner.js';

// Import socket handler
import { setupAuctionSocket } from './src/socket/auctionSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO to request object
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/team-owner', teamOwnerRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Auction API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Setup Socket.IO
setupAuctionSocket(io);

// Initialize database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Initialize database tables
        await initializeDatabase();

        // Seed/Reset Admin User (Ensures access on deployment)
        await seedAdmin();

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}`);
            console.log(`🔌 Socket.IO ready for connections\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    httpServer.close(() => {
        pool.end();
        console.log('Server closed');
        process.exit(0);
    });
});
