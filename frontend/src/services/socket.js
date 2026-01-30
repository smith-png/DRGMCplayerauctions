import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        if (this.socket && this.connected) {
            return this.socket;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected');
            this.connected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Auction events
    onAuctionStart(callback) {
        if (this.socket) {
            this.socket.on('auction-update', (data) => {
                if (data.type === 'started') callback(data);
            });
        }
    }

    onBidUpdate(callback) {
        if (this.socket) {
            this.socket.on('bid-update', callback);
        }
    }

    onPlayerSold(callback) {
        if (this.socket) {
            this.socket.on('auction-update', (data) => {
                if (data.type === 'sold') callback(data);
            });
        }
    }

    onAuctionUpdate(callback) {
        if (this.socket) {
            this.socket.on('auction-update', callback);
        }
    }

    // Emit events
    emitNewBid(bidData) {
        if (this.socket && this.connected) {
            this.socket.emit('new-bid', bidData);
        }
    }

    emitAuctionStarted(data) {
        if (this.socket && this.connected) {
            this.socket.emit('auction-started', data);
        }
    }

    emitPlayerSold(data) {
        if (this.socket && this.connected) {
            this.socket.emit('player-sold', data);
        }
    }

    joinAuction() {
        if (this.socket && this.connected) {
            this.socket.emit('join-auction');
        }
    }

    // Remove listeners
    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    removeListener(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
