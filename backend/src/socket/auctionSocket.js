import pool from '../config/database.js';

export function setupAuctionSocket(io) {
    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        // Join auction room
        socket.on('join-auction', () => {
            socket.join('auction-room');
            console.log('Client joined auction room:', socket.id);
        });

        // Handle auction start
        socket.on('auction-started', async (data) => {
            try {
                const { playerId } = data;
                const playerResult = await pool.query(
                    'SELECT * FROM players WHERE id = $1',
                    [playerId]
                );

                if (playerResult.rows.length > 0) {
                    io.to('auction-room').emit('auction-update', {
                        type: 'started',
                        player: playerResult.rows[0],
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error('Socket auction start error:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });
}
