import pool from '../config/database.js';

export function setupAuctionSocket(io) {
    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        // Join auction room
        socket.on('join-auction', () => {
            socket.join('auction-room');
            console.log('Client joined auction room:', socket.id);
        });

        // Handle bid placement (broadcast to all clients)
        socket.on('new-bid', async (data) => {
            try {
                const { teamId, amount, playerId } = data;

                // Get team and player info
                const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);
                const playerResult = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);

                if (teamResult.rows.length > 0 && playerResult.rows.length > 0) {
                    io.to('auction-room').emit('bid-update', {
                        teamId,
                        teamName: teamResult.rows[0].name,
                        amount,
                        playerId,
                        playerName: playerResult.rows[0].name,
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error('Socket bid error:', error);
            }
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

        // Handle player sold
        socket.on('player-sold', async (data) => {
            try {
                const { playerId, teamId, amount } = data;

                const playerResult = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
                const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);

                if (playerResult.rows.length > 0 && teamResult.rows.length > 0) {
                    io.to('auction-room').emit('auction-update', {
                        type: 'sold',
                        playerName: playerResult.rows[0].name,
                        teamName: teamResult.rows[0].name,
                        amount,
                        timestamp: new Date()
                    });

                    // Emit leaderboard update
                    socket.emit('refresh-leaderboard');
                }
            } catch (error) {
                console.error('Socket player sold error:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });
}
