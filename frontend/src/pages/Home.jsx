import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';
import TeamCarousel from '../components/TeamCarousel';


export default function Home() {
    const { user } = useAuth();

    return (
        <div className="home-container">
            <section className="hero-section">
                <div className="container hero-container-grid">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            🏆 Player Auction System
                        </h1>
                        <p className="hero-subtitle">
                            Live Auction website for the DRGMC sports events! Sign up and Register to participate in the Auction.
                        </p>
                        <div className="hero-buttons">
                            {user ? (
                                <>
                                    <Link to="/auction" className="btn btn-primary">
                                        Join Live Auction
                                    </Link>
                                    <Link to="/register-player" className="btn btn-secondary">
                                        Register as Player
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="btn btn-primary">
                                        Get Started
                                    </Link>
                                    <Link to="/auction" className="btn btn-secondary">
                                        Watch Live Auction
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-value">150+</span>
                                <span className="stat-label">Players</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-value">12</span>
                                <span className="stat-label">Teams</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-value">3</span>
                                <span className="stat-label">Sports</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visuals">
                        <div className="floating-card card-1">
                            <div className="fc-header">
                                <span className="fc-badge">Sold</span>
                                <span className="fc-price">12,000 Points</span>
                            </div>
                            <div className="fc-body">
                                <div className="fc-avatar">🏏</div>
                                <div className="fc-info">
                                    <h4>Star Batsman</h4>
                                    <p>Cricket • 3rd Year</p>
                                </div>
                            </div>
                        </div>
                        <div className="floating-card card-2">
                            <div className="fc-header">
                                <span className="fc-badge badge-live">Live Bid</span>
                                <span className="fc-price">8,500 Points</span>
                            </div>
                            <div className="fc-body">
                                <div className="fc-avatar">⚽</div>
                                <div className="fc-info">
                                    <h4>Pro Striker</h4>
                                    <p>Futsal • 2nd Year</p>
                                </div>
                            </div>
                        </div>
                        <div className="floating-card card-3">
                            <div className="fc-header">
                                <span className="fc-badge">Top Pick</span>
                                <span className="fc-price">15,000 Points</span>
                            </div>
                            <div className="fc-body">
                                <div className="fc-avatar">🏐</div>
                                <div className="fc-info">
                                    <h4>Ace Spiker</h4>
                                    <p>Volleyball • 4th Year</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <TeamCarousel />

            <section className="sports-section">
                <h2 className="section-title">Roster of Sports</h2>
                <div className="sports-grid">
                    <Link to="/players/cricket" className="sport-card">
                        <div className="sport-icon">🏏</div>
                        <h3>Cricket</h3>
                        <p>Click here to view all participating player profiles!</p>
                    </Link>
                    <Link to="/players/futsal" className="sport-card">
                        <div className="sport-icon">⚽</div>
                        <h3>Futsal</h3>
                        <p>Click here to view all participating player profiles!</p>
                    </Link>
                    <Link to="/players/volleyball" className="sport-card">
                        <div className="sport-icon">🏐</div>
                        <h3>Volleyball</h3>
                        <p>Click here to view all participating player profiles!</p>
                    </Link>
                </div>
            </section>

            <section className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Start?</h2>
                    <p>Register as a player to participate in the auction and DRGMC games commensing on 20th Feb.</p>
                    {!user && (
                        <Link to="/login" className="btn btn-primary btn-large">
                            Sign Up Now
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}
