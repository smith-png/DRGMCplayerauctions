import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';
import TeamCarousel from '../components/TeamCarousel';

export default function Home() {
    const { user } = useAuth();

    return (
        <div className="editorial-home">
            {/* HERO SECTION */}
            <section className="editorial-hero">
                <div className="hero-grid">
                    <div className="hero-text-zone">
                        <div className="hero-meta">EST. 2026 • OFFICIAL AUCTION TERMINAL</div>
                        <h1 className="hero-display">
                            THE<br />
                            <span className="text-outline">DRGMC</span><br />
                            PLAYER AUCTIONS
                        </h1>
                        <p className="hero-desc">
                            Live Auction website for the DRGMC sports events! Sign up and Register to participate in the Auction.
                        </p>

                        <div className="hero-actions">
                            {user ? (
                                <Link to="/auction" className="btn-sage">ENTER LIVE AUCTION</Link>
                            ) : (
                                <>
                                    <Link to="/login" className="btn-sage">MEMBER LOGIN</Link>
                                    <Link to="/register-player" className="btn-outline">APPLY FOR DRAFT</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* THE TICKER */}
                <div className="hero-ticker">
                    <div className="ticker-content">
                        <span>/// LIVE AUCTION FEED INITIALIZED</span>
                        <span>/// 150+ PLAYERS REGISTERED</span>
                        <span>/// 12 TEAMS LOCKED IN</span>
                        <span>/// 3 DISCIPLINES: CRICKET - FUTSAL - VOLLEYBALL</span>
                    </div>
                </div>
            </section>

            {/* TEAM MARQUEE */}
            <TeamCarousel />

            {/* SPORTS COLUMNS */}
            <section className="sports-columns">
                <Link to="/players/cricket" className="sport-col cricket-col">
                    <div className="col-overlay"></div>
                    <div className="col-content">
                        <span className="col-number">01</span>
                        <h2 className="col-title">CRICKET</h2>
                        <span className="col-link">VIEW ROSTER &rarr;</span>
                    </div>
                </Link>
                <Link to="/players/futsal" className="sport-col futsal-col">
                    <div className="col-overlay"></div>
                    <div className="col-content">
                        <span className="col-number">02</span>
                        <h2 className="col-title">FUTSAL</h2>
                        <span className="col-link">VIEW ROSTER &rarr;</span>
                    </div>
                </Link>
                <Link to="/players/volleyball" className="sport-col volleyball-col">
                    <div className="col-overlay"></div>
                    <div className="col-content">
                        <span className="col-number">03</span>
                        <h2 className="col-title">VOLLEYBALL</h2>
                        <span className="col-link">VIEW ROSTER &rarr;</span>
                    </div>
                </Link>
            </section>
        </div>
    );
}
