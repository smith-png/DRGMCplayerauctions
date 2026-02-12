import React from 'react';
import './FooterTicker.css';

const FooterTicker = () => {
    const tickerContent = "DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON • OFFICIAL AUCTION LEDGER ACTIVE • ";

    return (
        <div className="footer-ticker-shell">
            <div className="footer-ticker-track">
                {/* Repeat content for seamless loop */}
                {[...Array(10)].map((_, i) => (
                    <span key={i}>{tickerContent}</span>
                ))}
            </div>
        </div>
    );
};

export default FooterTicker;
