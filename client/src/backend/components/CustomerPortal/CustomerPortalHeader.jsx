import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';

const TikTokIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25h-3.13v12.9a2.85 2.85 0 1 1-2.85-3.12c.31 0 .61.04.9.14V9.17a6.01 6.01 0 0 0-.9-.07A6 6 0 1 0 15.82 15V8.46a8 8 0 0 0 4.69 1.51V6.69h-.92Z" />
    </SvgIcon>
);

const socialLinks = [
    {
        label: 'Facebook',
        href: 'https://www.facebook.com/flyawayballooning',
        Icon: FacebookIcon
    },
    {
        label: 'Instagram',
        href: 'https://www.instagram.com/flyawayballooning',
        Icon: InstagramIcon
    },
    {
        label: 'TikTok',
        href: 'https://www.tiktok.com/@flyawayballooning',
        Icon: TikTokIcon
    },
    {
        label: 'YouTube',
        href: 'https://www.youtube.com/channel/UCYJtQ_ah8mdR4wgsPXsL8eg',
        Icon: YouTubeIcon
    }
];

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
                    <nav className="cph-social" aria-label="Fly Away Ballooning social media links">
                        {socialLinks.map(({ label, href, Icon }) => (
                            <a
                                key={label}
                                className="cph-social-link"
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                            >
                                <Icon />
                            </a>
                        ))}
                    </nav>
                </div>
            </header>
    );
};

export default CustomerPortalHeader;
