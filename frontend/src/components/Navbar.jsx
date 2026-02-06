import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsAPI } from '../services/api';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [showUserOverlay, setShowUserOverlay] = useState(false);
    const [userTeam, setUserTeam] = useState(null);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const overlayRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target)) {
                setShowUserOverlay(false);
            }
        };

        if (showUserOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserOverlay]);

    useEffect(() => {
        if (user?.role === 'team_owner' && showUserOverlay) {
            fetchUserTeam();
        }
    }, [showUserOverlay, user]);

    const fetchUserTeam = async () => {
        setLoadingTeam(true);
        try {
            const response = await teamsAPI.getAllTeams();
            // Find team where this user is the owner (case-insensitive check)
            const team = response.data.teams.find(t =>
                t.owner_name && t.owner_name.trim().toLowerCase() === user.name.trim().toLowerCase()
            );
            setUserTeam(team);
        } catch (error) {
            console.error('Error fetching user team:', error);
        } finally {
            setLoadingTeam(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleUserOverlay = () => {
        setShowUserOverlay(!showUserOverlay);
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
                        {(user?.role === 'admin' || user?.role === 'team_owner') && (
                            <NavLink to="/auction-stats" className="nav-link">
                                <span>Auction Stats</span>
                            </NavLink>
                        )}

                        {user && (
                            <NavLink to="/register-player" className="nav-link">
                                <span>Register Player</span>
                            </NavLink>
                        )}

                        <NavLink to="/teams" className="nav-link">
                            <span>Teams</span>
                        </NavLink>

                        {isAdmin && (
                            <NavLink to="/admin" className="nav-link nav-link-admin">
                                <span>Admin</span>
                            </NavLink>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="navbar-user" ref={overlayRef}>
                        {user ? (
                            <div className="user-menu">
                                <div className="user-info" onClick={toggleUserOverlay} style={{ cursor: 'pointer' }}>
                                    <div className="user-details">
                                        <span className="user-name">{user.name || user.email}</span>
                                        <span className="user-role">{user.role}</span>
                                    </div>
                                </div>

                                {/* User Info Overlay */}
                                {showUserOverlay && (
                                    <div className="user-info-overlay">
                                        <div className="overlay-header">
                                            <h4>Account Details</h4>
                                        </div>
                                        <div className="overlay-content">
                                            <div className="overlay-item">
                                                <span className="overlay-label">Name:</span>
                                                <span className="overlay-value">{user.name || user.email}</span>
                                            </div>
                                            <div className="overlay-item">
                                                <span className="overlay-label">Role:</span>
                                                <span className="overlay-value">{user.role}</span>
                                            </div>
                                            {user.role === 'team_owner' && (
                                                <div className="overlay-item">
                                                    <span className="overlay-label">Team:</span>
                                                    <span className="overlay-value">
                                                        {loadingTeam ? 'Loading...' : (userTeam ? userTeam.name : 'No Team Assigned')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

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
