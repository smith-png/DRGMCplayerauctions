import React from 'react';
import './FooterTicker.css';

// Memoize the static footer ticker to prevent unnecessary re-renders
const FooterTicker = React.memo(() => {
    const tickerContent = "DRGMC PLAYER AUCTIONS • REGISTRATION OPEN • BIDDING STARTS SOON • OFFICIAL AUCTION LEDGER ACTIVE • ";

    return (
        <div className="footer-ticker-shell">
            <div className="footer-ticker-track">
                <span>{tickerContent}</span>
            </div>
        </div>
    );
});

export default FooterTicker;
