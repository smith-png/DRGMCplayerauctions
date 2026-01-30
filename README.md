# Player Auction System

A comprehensive web application for managing live player auctions across multiple sports (Cricket, Futsal, Volleyball) for intra-college tournaments.

## 🚀 Features

- **Live Auctions**: Real-time bidding with Socket.IO for instant updates
- **Player Management**: Register players with stats, photos, and sport-specific details
- **Team Tracking**: Monitor team budgets, rosters, and spending in real-time
- **Admin Dashboard**: Complete control over users, players, teams, and auctions
- **Multi-Sport Support**: Manage auctions for Cricket, Futsal, and Volleyball
- **Role-Based Access**: Admin, Auctioneer, Participant, and Viewer roles
- **Responsive Design**: Professional UI that works on all devices

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - REST API server
- **PostgreSQL** - Relational database
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - Authentication and authorization
- **Multer** - File upload handling
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates
- **CSS Variables** - Modern styling system

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** or **yarn** - Comes with Node.js

## 🔧 Local Development Setup

### 1. Clone or Navigate to Project

```bash
cd "C:\Users\Kshitij G Dhakane\.gemini\antigravity\scratch\auction-system"
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env
```

**Edit the `.env` file** with your database credentials:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/auction_db
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=http://localhost:5173
```

**Create PostgreSQL Database:**

```bash
# Open PostgreSQL command line (psql)
psql -U postgres

# Create database
CREATE DATABASE auction_db;

# Exit psql
\q
```

The database tables will be created automatically when you start the server.

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### 4. Start the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:5000`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

### 5. Access the Application

Open your browser and navigate to: **http://localhost:5173**

## 👤 Default Admin Setup

After starting the application, register the first user and manually update their role to 'admin' in the database:

```sql
-- Connect to database
psql -U postgres -d auction_db

-- Update user role to admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 📱 Usage Guide

### For Admins
1. **Login** with admin credentials
2. **Create Teams** in the Admin Dashboard
3. **Approve Players** who have registered
4. **Start Auctions** for approved players
5. **Manage Users** and assign roles

### For Participants
1. **Register** an account
2. **Register as Player** with stats and photo
3. **Wait for Admin Approval**
4. **View Live Auctions** and track your status

### For Auctioneers
1. **Start Auctions** for approved players
2. **Monitor Bids** in real-time
3. **Mark Players as Sold** when bidding completes

### For Viewers
1. **Watch Live Auctions** in real-time
2. **View Leaderboard** to track team standings
3. **See Player Rosters** and team budgets

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to:
- **Frontend**: Vercel or Netlify
- **Backend**: Render.com or Railway.app
- **Database**: Supabase or Neon (PostgreSQL)

## 📁 Project Structure

```
auction-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth & validation
│   │   ├── routes/          # API routes
│   │   └── socket/          # Socket.IO handlers
│   ├── uploads/             # Player photos
│   ├── .env.example         # Environment template
│   ├── package.json
│   └── server.js            # Entry point
└── frontend/
    ├── src/
    │   ├── components/      # Reusable components
    │   ├── context/         # React context
    │   ├── pages/           # Application pages
    │   ├── services/        # API & Socket clients
    │   └── styles/          # CSS files
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Players
- `POST /api/players` - Register player (with photo)
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `PUT /api/players/:id` - Update player (admin)
- `DELETE /api/players/:id` - Delete player (admin)

### Auction
- `POST /api/auction/start` - Start auction (admin/auctioneer)
- `POST /api/auction/bid` - Place bid
- `GET /api/auction/current` - Get current auction
- `POST /api/auction/sold` - Mark player sold (admin/auctioneer)
- `GET /api/auction/leaderboard` - Get team standings

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/teams` - Create team
- `GET /api/admin/teams` - Get all teams
- `PUT /api/admin/teams/:id` - Update team
- `DELETE /api/admin/teams/:id` - Delete team
- `GET /api/admin/stats` - Dashboard statistics

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env file
- Verify database exists: `psql -U postgres -l`

### Port Already in Use
- Backend: Change PORT in .env
- Frontend: Change port in vite.config.js

### Socket.IO Not Connecting
- Ensure backend is running
- Check CORS settings in server.js
- Verify VITE_SOCKET_URL in frontend

### File Upload Issues
- Check uploads/ directory exists
- Verify file size limits in playerController.js
- Ensure proper permissions on uploads folder

## 📄 License

MIT License - feel free to use this project for your tournaments!

## 🤝 Contributing

This is a custom project for intra-college tournaments. Feel free to fork and modify for your needs.

## 📧 Support

For issues or questions, please check the troubleshooting section or review the code comments.

---

**Built with ❤️ for MBBS Tournament Auctions**
