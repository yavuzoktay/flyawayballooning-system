import React from "react";
import Header from "./Header";
import { Outlet } from "react-router"

const MainLayout = () => {
    return (
        <div className="main-admin-wrap">
            <div className="topbar-wrap">
                <Header />
            </div>
            <div className="final-body-wrap">
                <Outlet />
            </div>
        </div>
    )
}

export default MainLayout;