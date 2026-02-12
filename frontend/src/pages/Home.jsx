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
                <div className="hero-subtitle">
                    <div className="subtitle-bar"></div>
                    <span>THE OFFICIAL LEAGUE | SEASON 2025</span>
                </div>
                <h1 className="hero-main-title">DRGMC PLAYER AUCTIONS</h1>

                <p className="hero-desc">
                    The official digital terminal for DRGMC Player Auctions.
                    Streamlined bidding, real-time rosters, and professional draft management
                    across three major disciplines.
                </p>

                <div className="hero-actions">
                    {user ? (
                        <Link to="/auction" className="btn-editorial btn-primary">ENTER LIVE AUCTION</Link>
                    ) : (
                        <>
                            <Link to="/login" className="btn-editorial btn-primary">MEMBER LOGIN</Link>
                            <Link to="/register-player" className="btn-editorial btn-outline-editorial">APPLY FOR DRAFT</Link>
                        </>
                    )}
                </div>
            </section>

            {/* TEAM MARQUEE */}
            <div className="team-carousel-container">
                <TeamCarousel />
            </div>

            {/* SPORTS SLICES */}
            <section className="sports-slices">
                <Link to="/players/cricket" className="sport-slice cricket-slice">
                    <div className="slice-overlay"></div>
                    <div className="slice-content">
                        <span className="slice-number">01</span>
                        <div className="slice-name">CRICKET</div>
                    </div>
                </Link>
                <Link to="/players/futsal" className="sport-slice futsal-slice">
                    <div className="slice-overlay"></div>
                    <div className="slice-content">
                        <span className="slice-number">02</span>
                        <div className="slice-name">FUTSAL</div>
                    </div>
                </Link>
                <Link to="/players/volleyball" className="sport-slice volleyball-slice">
                    <div className="slice-overlay"></div>
                    <div className="slice-content">
                        <span className="slice-number">03</span>
                        <div className="slice-name">VOLLEYBALL</div>
                    </div>
                </Link>
            </section>

            {/* THE TICKER */}
            <div className="editorial-ticker">
                <div className="ticker-wrap">
                    <span className="ticker-item">• DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON •</span>
                    <span className="ticker-item">• DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON •</span>
                    <span className="ticker-item">• DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON •</span>
                    <span className="ticker-item">• DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON •</span>
                </div>
            </div>
        </div>
    );
}
