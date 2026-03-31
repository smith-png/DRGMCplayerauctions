import React from 'react';
import './FooterTicker.css';

// ⚡ Bolt: Wrapped with React.memo() to prevent unnecessary re-renders
// Since this component uses a static string and has no props, it never needs to re-render
// This saves rendering cycles when parent pages (Home, OwnerDashboard) update their state
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
