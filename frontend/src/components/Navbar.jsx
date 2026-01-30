import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="container">
                <div className="navbar-content">
                    {/* Logo/Brand */}
                    <Link to="/" className="navbar-brand">
                        <span className="brand-text">Player Auction</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="navbar-links">
                        <NavLink to="/" className="nav-link" end>
                            <span>Home</span>
                        </NavLink>
                        <NavLink to="/auction" className="nav-link">
                            <span>Live Auction</span>
                        </NavLink>
                        <NavLink to="/leaderboard" className="nav-link">
                            <span>Leaderboard</span>
                        </NavLink>

                        {user && (
                            <NavLink to="/register-player" className="nav-link">
                                <span>Register Player</span>
                            </NavLink>
                        )}

                        {isAdmin && (
                            <NavLink to="/admin" className="nav-link nav-link-admin">
                                <span>Admin</span>
                            </NavLink>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="navbar-user">
                        {user ? (
                            <div className="user-menu">
                                <div className="user-info">
                                    <div className="user-details">
                                        <span className="user-name">{user.name || user.email}</span>
                                        <span className="user-role">{user.role}</span>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="btn btn-logout">
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="btn btn-primary">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
