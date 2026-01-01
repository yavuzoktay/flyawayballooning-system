import React, { useState } from "react";
import Header, { BottomNav } from "./Header";
import { Outlet } from "react-router"
import { Box, useTheme, useMediaQuery } from "@mui/material";

const MainLayout = () => {
    const [hasNewBookings, setHasNewBookings] = useState(false);
    const [hasNewVouchers, setHasNewVouchers] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleMenuClick = (menuItem, path) => {
        // This will be handled by Header's navigation
    };

    return (
        <div className="main-admin-wrap">
            <div className="topbar-wrap">
                <Header 
                    onMenuClick={handleMenuClick}
                    onNotificationsChange={(bookings, vouchers) => {
                        setHasNewBookings(bookings);
                        setHasNewVouchers(vouchers);
                    }}
                />
            </div>
            <div 
                className="final-body-wrap" 
                style={{ 
                    paddingBottom: isMobile ? '70px' : '0' 
                }}
            >
                <Outlet />
            </div>
            {isMobile && (
                <BottomNav 
                    hasNewBookings={hasNewBookings}
                    hasNewVouchers={hasNewVouchers}
                    onMenuClick={handleMenuClick}
                />
            )}
        </div>
    )
}

export default MainLayout;