import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsAPI } from '../services/api';
import './Navbar.css';

// Design Migration Confirmed
export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [isCompact, setIsCompact] = useState(false);
    const [userTeam, setUserTeam] = useState(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsCompact(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [showUserOverlay, setShowUserOverlay] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target)) {
                setShowUserOverlay(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user?.role === 'team_owner' && user?.team_id && showUserOverlay) {
            const fetchTeam = async () => {
                try {
                    const res = await teamsAPI.getAllTeams();
                    const team = res.data.teams.find(t => t.id === user.team_id);
                    setUserTeam(team);
                } catch (err) { console.error(err); }
            };
            fetchTeam();
        }
    }, [showUserOverlay, user]);

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className={`glass-nav-container ${isCompact ? 'nav-compact' : ''}`}>
            <nav className="glass-nav">
                <div className="container">
                    <div className="navbar-content">
                        <Link to="/" className="navbar-brand">
                            <span className="brand-text">PLAYER AUCTION SYSTEM</span>
                        </Link>

                        <div className="navbar-links">
                            <NavLink to="/" className="nav-link">HOME</NavLink>
                            <NavLink to="/auction" className="nav-link">LIVE AUCTION</NavLink>
                            <NavLink to="/teams" className="nav-link">TEAMS</NavLink>

                            {user && (
                                <NavLink to="/auction-stats" className="nav-link">AUCTION STATS</NavLink>
                            )}

                            {user && (
                                <NavLink to="/register-player" className="nav-link">REGISTER</NavLink>
                            )}

                            {isAdmin && (
                                <NavLink to="/admin" className="nav-link nav-link-admin">ADMIN</NavLink>
                            )}
                        </div>

                        <div className="navbar-user" ref={overlayRef}>
                            {user ? (
                                <>
                                    <div className="user-info" onClick={() => setShowUserOverlay(!showUserOverlay)}>
                                        <div className="user-details">
                                            <span className="user-name">{user.name}</span>
                                            <span className="user-role">{user.role.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    {showUserOverlay && (
                                        <div className="user-info-overlay">
                                            <div className="overlay-header"><h4>ACCOUNT</h4></div>
                                            <div className="overlay-content">
                                                <div className="overlay-item">
                                                    <span className="overlay-label">USER</span>
                                                    <span className="overlay-value">{user.name}</span>
                                                </div>
                                                {userTeam && (
                                                    <div className="overlay-item">
                                                        <span className="overlay-label">TEAM</span>
                                                        <span className="overlay-value">{userTeam.name}</span>
                                                    </div>
                                                )}
                                                <button onClick={handleLogout} className="btn-logout">LOGOUT</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>LOGIN</Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
}
