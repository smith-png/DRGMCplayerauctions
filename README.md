# DRGMC Player Auction System

A full-stack, real-time auction platform designed for intra-college sports events. This system facilitates player registrations, team management, and live bidding sessions for sports like Cricket, Futsal, and Volleyball.

## Core Features

- Real-Time Bidding: Powered by Socket.io for instantaneous bid updates across all connected clients.
- Advanced Auction Controls: Functionality for skipping players, marking as sold/unsold, and managing the player queue.
- Admin Dashboard: Comprehensive management of users, players, teams, and global auction states.
- Dynamic Leaderboards: Real-time tracking of team budgets, player acquisitions, and auction progress.
- Role-Based Access: Dedicated views and permissions for Admins, Auctioneers, Team Owners, and Viewers.
- Media Support: Integrated Cloudinary support for player photos and team logos.

## Technology Stack

- Frontend: React.js, Vite, Vanilla CSS.
- Backend: Node.js, Express.js.
- Database: PostgreSQL with pg-pool.
- Real-Time: Socket.io.
- Storage: Cloudinary API.
- Authentication: JSON Web Tokens (JWT).

## Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Cloudinary Account

### Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a .env file based on .env.example:
   ```env
   PORT=5000
   DATABASE_URL=your_postgresql_url
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in a .env file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Database Schema

The system automatically initializes the required tables upon backend startup. This includes:
- users: Authentication and role management.
- teams: Team details, sports categorization, and budget tracking.
- players: Player stats, auction status, and team assignments.
- bids: Historical tracking of all bid actions.
- auction_state: Global control for current player and auction status.
