import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';
import TeamCarousel from '../components/TeamCarousel';
import FooterTicker from '../components/FooterTicker';

export default function Home() {
    const { user } = useAuth();

    return (
        <div className="editorial-home">
            {/* HERO SECTION */}
            <section className="editorial-hero">
                <div className="hero-subtitle">
                    <div className="subtitle-bar"></div>
                    <span>THE UNOFFICIAL LEAGUE | SEASON 2026</span>
                </div>
                <h1 className="hero-main-title">DRGMC PLAYER AUCTIONS</h1>

                <p className="hero-desc">
                    Live Auction website for the DRGMC sports events! Sign up and Register to participate in the Auction.
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
            <FooterTicker />
        </div>
    );
}
