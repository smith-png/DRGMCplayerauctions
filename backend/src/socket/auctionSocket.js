import pool from '../config/database.js';

export function setupAuctionSocket(io) {
    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        // Join auction room
        socket.on('join-auction', () => {
            socket.join('auction-room');
            console.log('Client joined auction room:', socket.id);
        });

    }
        });

socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
});
    });
}
