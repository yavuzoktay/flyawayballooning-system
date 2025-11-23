import React from 'react';

const CustomerPortalHeader = () => {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <header className="customer-portal-header">
            <div className="cph-inner">
                <div className="cph-brand" onClick={() => scrollToSection('portal-main')}>
                    <img src="/FAB_Logo_DarkBlue.png" alt="Fly Away Ballooning" />
                </div>

            </div>
        </header>
    );
};

export default CustomerPortalHeader;

