import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import PlayerRegistration from './pages/PlayerRegistration';
import AuctionLive from './pages/AuctionLive';
import AuctionStats from './pages/AuctionStats';
import Admin from './pages/Admin';
import Testgrounds from './pages/Testgrounds';
import Teams from './pages/Teams';
import PlayerProfilesBySport from './pages/PlayerProfilesBySport';
// import PlayerProfiles from './pages/PlayerProfiles'; // Kept for future use
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

function Layout() {
    const location = useLocation();
    const showNavbar = location.pathname !== '/login' && location.pathname !== '/register';

    return (
        <>
            {showNavbar && <Navbar />}
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
                                <Admin />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/testgrounds"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <Testgrounds />
                            </ProtectedRoute>
                        }
                    />
                    {/* Public Routes */}
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/players/:sport" element={<PlayerProfilesBySport />} />
                    {/* Old player profiles - kept for future use */}
                    {/* <Route path="/player-profiles" element={<PlayerProfiles />} /> */}
                </Routes>
            </main>
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Layout />
            </Router>
            <Analytics />
            <SpeedInsights />
        </AuthProvider>
    );
}
