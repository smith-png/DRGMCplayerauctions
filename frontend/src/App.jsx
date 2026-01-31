import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
// import ThemeToggle from './components/ThemeToggle'; // Removed
import Home from './pages/Home';
import Login from './pages/Login';
import PlayerRegistration from './pages/PlayerRegistration';
import AuctionLive from './pages/AuctionLive';
import AuctionStats from './pages/AuctionStats';
import AdminDashboard from './pages/AdminDashboard';
import './styles/index.css';

function ProtectedRoute({ children, requireAdmin = false }) {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Router>
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Login />} />
                    <Route
                        path="/register-player"
                        element={
                            <ProtectedRoute>
                                <PlayerRegistration />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/auction" element={<AuctionLive />} />
                    <Route path="/auction-stats" element={<AuctionStats />} />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </main>
        </Router>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
