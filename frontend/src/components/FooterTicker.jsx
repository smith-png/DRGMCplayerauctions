import React from 'react';
import './FooterTicker.css';

export default function FooterTicker() {
    // Duplicate the message for infinite scroll effect
    const tickerMessage = "DRGMC PLAYER AUCTIONS 2025 /// BUILT WITH PASSION /// DESIGNED FOR EXCELLENCE /// ";
    const fullMessage = tickerMessage.repeat(3);

    return (
        <div className="footer-ticker-shell">
            <div className="footer-ticker-track">
                {fullMessage}
            </div>
        </div>
    );
}
