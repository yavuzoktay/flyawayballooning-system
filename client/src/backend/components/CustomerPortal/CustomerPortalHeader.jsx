import React, { useState } from 'react';

const CustomerPortalHeader = ({ onNavigate = () => {} }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleNavClick = (id) => {
        setMenuOpen(false);
        onNavigate(id);
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <header className="customer-portal-header">
            <div className="cph-inner">
                <div className="cph-brand" onClick={() => { handleNavClick('portal-main'); scrollToSection('portal-main'); }}>
                    <img src="/FAB_Logo_DarkBlue.png" alt="Fly Away Ballooning" />
                    <div className="cph-brand-text">
                        <span className="cph-label">Customer Portal</span>
                        <span className="cph-sub">Manage your flight experience</span>
                    </div>
                </div>

                <button
                    className={`cph-burger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(prev => !prev)}
                    aria-label="Toggle navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav className={`cph-nav ${menuOpen ? 'open' : ''}`}>
                    <button
                        className="cph-link"
                        onClick={() => { handleNavClick('portal-main'); scrollToSection('portal-main'); }}
                    >
                        Main
                    </button>
                    <button
                        className="cph-link"
                        onClick={() => { handleNavClick('scroll-target-booking'); scrollToSection('scroll-target-booking'); }}
                    >
                        Booking
                    </button>
                    <button
                        className="cph-link"
                        onClick={() => { handleNavClick('live-availability'); scrollToSection('live-availability'); }}
                    >
                        Available
                    </button>
                    <button
                        className="cph-link"
                        onClick={() => { handleNavClick('additional-info'); scrollToSection('additional-info'); }}
                    >
                        Information
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default CustomerPortalHeader;

